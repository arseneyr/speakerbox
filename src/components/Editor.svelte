<script lang="ts">
  import Textfield from "@smui/textfield/styled";
  import Button, { Group, Icon, Label } from "@smui/button/styled";
  import Tooltip, { Wrapper } from "@smui/tooltip/styled";
  import CloseButton from "./CloseButton.svelte";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import type { SampleStore } from "$lib/store";
  import EditManager from "$lib/EditManager";
  import type { Region } from "wavesurfer.js/src/plugin/regions";

  export let sampleStore: SampleStore;
  export function stop() {
    wavesurfer?.stop();
  }

  const dispatch = createEventDispatcher();

  const { title, audioBuffer } = sampleStore;

  const editManager = new EditManager();
  const { audioBuffer: workingBuffer, undoable, redoable } = editManager;
  $: $audioBuffer && editManager.loadData($audioBuffer);

  let paused = true;
  let waveformEl: HTMLDivElement;
  let wavesurfer: WaveSurfer;
  let region: Region | null = null;
  let ready = false;

  let regionClose: CloseButton;

  let currentTitleValue = $title;
  function onSave() {
    $title = currentTitleValue;
    $workingBuffer && sampleStore.setAudioBuffer($workingBuffer);
    dispatch("save");
    dispatch("close");
  }
  function onCancel() {
    dispatch("close");
  }
  const commonHandleStyles = {
    backgroundColor: "#ebeee7",
    cursor: "pointer",
  };
  const regionConfig = {
    id: 0,
    color: "rgba(255,255,255,0.1)",
    handleStyle: {
      left: { ...commonHandleStyles },
      right: { ...commonHandleStyles },
    },
  };

  $: if (wavesurfer && $workingBuffer) {
    wavesurfer.loadDecodedBuffer($workingBuffer);
  } else {
    ready = false;
  }

  $: if (wavesurfer) {
    if (paused && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    } else if (!paused && !wavesurfer.isPlaying()) {
      wavesurfer.play();
    }
  }

  function onRegionClose() {
    regionClose.$destroy();
    region!.remove();
    region = null;
    wavesurfer.enableDragSelection(regionConfig);
  }

  function onNewRegion(newRegion: Region) {
    region = newRegion;
    wavesurfer.disableDragSelection();
    function onPlaybackLeave() {
      newRegion.un("out", onPlaybackLeave);
      paused = true;
    }
    newRegion.handleLeftEl!.addEventListener("click", (e) => {
      e.stopPropagation();
      newRegion.play();
      paused = false;
    });
    newRegion.handleRightEl!.addEventListener("click", (e) => {
      e.stopPropagation();
      newRegion.un("out");
      newRegion.on("out", onPlaybackLeave);
      wavesurfer.play(
        Math.max(newRegion.end - 1, newRegion.start),
        newRegion.end
      );
      paused = false;
    });
    regionClose = new CloseButton({
      target: newRegion.element,
    });
    regionClose.$on("click", (event) => {
      event.stopPropagation();
      onRegionClose();
    });
  }

  function onEdit(type: "cut" | "crop") {
    if (type === "cut") {
      editManager.cut(region!.start, region!.end);
    } else if (type === "crop") {
      editManager.crop(region!.start, region!.end);
    }
    wavesurfer.stop();
    paused = true;
    onRegionClose();
  }

  async function onUndo() {
    wavesurfer.stop();
    paused = true;
    const action = editManager.undo();
    // await tick();
    if (action) {
      if (region) {
        region.start = action.startTime;
        region.end = action.endTime;
      } else {
        onNewRegion(
          wavesurfer.addRegion({
            ...regionConfig,
            start: action.startTime,
            end: action.endTime,
          })
        );
      }
    }
  }
  function onRedo() {
    wavesurfer.stop();
    paused = true;
    region && onRegionClose();
    editManager.redo();
  }

  onMount(() => {
    (async () => {
      const Wavesurfer = (await import("wavesurfer.js")).default;
      const Regions = (
        await import("wavesurfer.js/dist/plugin/wavesurfer.regions")
      ).default;
      wavesurfer = Wavesurfer.create({
        container: waveformEl,
        responsive: true,
        plugins: [Regions.create()],
      });

      // wavesurfer uses scrollWidth for progress calculations. Since the region
      // is a child of the waveform, the region handles get included in scrollWidth
      // even though there is no waveform past the end of the region
      wavesurfer.drawer.wrapper = new Proxy(wavesurfer.drawer.wrapper, {
        get(target, prop) {
          if (prop === "scrollWidth") {
            return target.clientWidth;
          }
          return target[prop];
        },
      });

      wavesurfer.on("ready", () => {
        ready = true;
        wavesurfer.enableDragSelection(regionConfig);
        wavesurfer.on("region-created", () =>
          wavesurfer.on("region-update-end", (r) => {
            (wavesurfer.un as any)("region-update-end");
            onNewRegion(r);
          })
        );
        wavesurfer.on("finish", () => {
          paused = true;
          wavesurfer.stop();
        });
        (wavesurfer.un as any)("ready");
      });
    })();

    return () => wavesurfer.destroy();
  });
</script>

<div class="root fullWidth">
  <div class="topBar">
    <Textfield
      bind:value={currentTitleValue}
      class="title"
      input$spellcheck="false"
      input$autocomplete="off"
      input$autocorrect="off"
      input$autocapitalize="off"
    />

    <!-- <CloseButton on:click={() => dispatch("close")} /> -->
    <div class="saveButtons">
      <Button on:click={onSave}
        ><Icon class="material-icons">save</Icon><Label>Save</Label></Button
      >
      <Button color="secondary" on:click={onCancel}
        ><Icon class="material-icons">close</Icon><Label>Cancel</Label></Button
      >
    </div>
  </div>
  <div class="waveform" bind:this={waveformEl} />
  <div class="buttonPanel">
    <Group variant="outlined" disabled={!ready}>
      <Button
        variant="outlined"
        color="secondary"
        on:click={() => (paused = !paused)}
        disabled={!ready}
      >
        {#if paused}
          <Icon class="material-icons">play_arrow</Icon>
        {:else}
          <Icon class="material-icons">pause</Icon>
        {/if}
      </Button>
    </Group>
    <Group variant="outlined">
      <Wrapper>
        <Button
          variant="outlined"
          color="secondary"
          disabled={!region}
          on:click={() => onEdit("cut")}
          ><Icon class="material-icons">content_cut</Icon>
        </Button>
        <Tooltip xPos="start">Cut</Tooltip>
      </Wrapper>
      <Wrapper>
        <Button
          variant="outlined"
          color="secondary"
          disabled={!region}
          on:click={() => onEdit("crop")}
          ><Icon class="material-icons">crop</Icon>
        </Button>
        <Tooltip>Crop</Tooltip>
      </Wrapper>
    </Group>
    <Group variant="outlined">
      <Wrapper>
        <Button
          variant="outlined"
          color="secondary"
          disabled={!$undoable}
          on:click={onUndo}
          ><Icon class="material-icons">undo</Icon>
        </Button>
        <Tooltip xPos="start">Undo</Tooltip>
      </Wrapper>
      <Wrapper>
        <Button
          variant="outlined"
          color="secondary"
          disabled={!$redoable}
          on:click={onRedo}
          ><Icon class="material-icons">redo</Icon>
        </Button>
        <Tooltip>Redo</Tooltip>
      </Wrapper>
    </Group>
  </div>
</div>

<style lang="scss">
  @use '@material/typography/index' as typography;
  @use '@material/icon-button/index' as icon-button;

  .root {
    width: 100%;
    background-color: #111111;
    display: flex;
    flex-direction: column;
    padding: 0px 24px 24px 24px;
    box-sizing: border-box;
  }
  .topBar {
    display: flex;
    flex-direction: row;
    margin-bottom: 16px;
    justify-content: space-between;
    align-items: center;
    margin-right: -16px;
  }
  .topBar > :global(.title) {
    max-width: 500px;
    flex-grow: 1;
  }
  .topBar > :global(.title > input) {
    @include typography.typography("headline5");
  }
  .saveButtons {
    margin: 16px 8px;
  }
  .waveform > :global(wave) {
    overflow: unset !important;
  }
  .root :global(.wavesurfer-region) {
    z-index: 4 !important;
    position: relative;
  }

  .root :global(.wavesurfer-region > button) {
    @include icon-button.density(-5);
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .root :global(.wavesurfer-handle::before) {
    content: "";
    font-family: "Material Icons";
    color: black;
    display: inline-flex;
    width: 24px;
    height: 48px;
    background-color: #ebeee7;
    position: absolute;
    top: 50%;
    margin-top: -24px;
    justify-content: center;
    align-items: center;
  }
  @mixin handle($side) {
    border-top-#{$side}-radius: 24px;
    border-bottom-#{$side}-radius: 24px;
    margin-#{$side}: -23px;
  }

  .root :global(.wavesurfer-handle-start::before) {
    @include handle(left);
  }
  .root :global(.wavesurfer-handle-end::before) {
    @include handle(right);
  }

  .buttonPanel {
    display: flex;
    margin-top: 8px;
    justify-content: space-between;

    :global(button) {
      min-width: 16px;
    }

    :global(button i) {
      margin: 0px;
    }
  }
</style>
