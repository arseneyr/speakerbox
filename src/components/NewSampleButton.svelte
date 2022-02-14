<script lang="ts">
  import {
    NoAudioTracksError,
    PermissionDeniedError,
    startAudioRecording,
  } from "$lib/recorder";
  import AddButton from "./AddButton.svelte";
  import { getMainStore, SampleStore } from "$lib/store";
  import Button, { Icon, Label } from "@smui/button";
  import Snackbar, { Actions } from "@smui/snackbar";
  import IconButton from "@smui/icon-button";
  import { fileOpen } from "browser-fs-access";
  import { createEventDispatcher } from "svelte";
  import { SampleAddTypes } from "$lib/types";

  let stopRecording: (() => void) | null = null;

  let snackbar: any;
  let error: string;

  const mainStore = getMainStore()!;
  const { settings } = mainStore;

  let lastSampleAddType: SampleAddTypes | undefined;

  const dispatch = createEventDispatcher();

  $: if (!lastSampleAddType && $settings?.lastSampleAddType) {
    onSampleAdd($settings.lastSampleAddType);
  } else if (lastSampleAddType && $settings) {
    mainStore.updateSettings({ ...$settings, lastSampleAddType });
  }

  function onSampleAdd(type: SampleAddTypes) {
    lastSampleAddType = type;
    const index = options.findIndex((o) => o.type === type);
    if (index >= 0) {
      // options = [options[index]].concat(options.splice(index, 1));
      let r = options.splice(index, 1)[0];
      options.unshift(r);
      options = options;
    }
  }

  let options = [
    {
      type: SampleAddTypes.RECORD_DESKTOP,
      text: "Record Desktop",
      icon: "mic",
      onClick: onRecord,
    },
    {
      type: SampleAddTypes.UPLOAD,
      text: "Upload file",
      icon: "file_upload",
      onClick: onUpload,
    },
  ].map((o) => ({
    ...o,
    onClick: () => {
      onSampleAdd(o.type);
      o.onClick();
    },
  }));

  async function onRecord() {
    snackbar?.close();
    try {
      const recorder = await startAudioRecording();
      stopRecording = recorder.stop;
      recorder.buffer.then((buf) => {
        stopRecording = null;
        if (buf === null) {
          error = "No audio detected. Did you mean to play something?";
          snackbar?.open();
        } else {
          onNewSamples([
            new SampleStore({
              data: buf,
              title: `Recorded on ${new Date().toISOString().substring(0, 19)}`,
            }),
          ]);
        }
      });
    } catch (e) {
      stopRecording = null;
      if (e instanceof PermissionDeniedError) {
        // Do Nothing
      } else if (e instanceof NoAudioTracksError) {
        error = "Please select 'Share Audio'";
        snackbar?.open();
      } else {
        error = "Unknown error :(";
        snackbar?.open();
        console.error(e);
      }
    }
  }

  async function onUpload() {
    try {
      const files = await fileOpen({
        mimeTypes: ["audio/*", "video/*"],
        multiple: true,
        description: "Audio or video files",
      });
      onNewSamples(
        files.map((file) => new SampleStore({ data: file, title: file.name }))
      );
    } catch (e) {}
  }

  function onNewSamples(sampleIds: SampleStore[]) {
    dispatch("newSamples", sampleIds);
  }
</script>

{#if stopRecording}
  <Button on:click={stopRecording} variant="raised" color="primary">
    <Icon class="material-icons">stop</Icon>
    <Label style="padding-top: 2px">Stop</Label>
  </Button>
{:else}
  <AddButton {options} />
{/if}

<Snackbar bind:this={snackbar} timeoutMs={5000} surface$class="snackbarSurface">
  <Label>{error}</Label>
  <Actions>
    <IconButton class="material-icons">close</IconButton>
  </Actions>
</Snackbar>

<style lang="scss">
  @use "../theme";
  :global(.snackbarSurface) {
    background-color: theme.$mainColor;
  }
  :global(.snackbarSurface > span) {
    color: white;
  }
</style>
