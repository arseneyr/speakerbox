<script lang="ts">
  import Button, { Icon, Label } from "@smui/button/styled";
  import Grid from "$lib/components/Grid.svelte";
  import AddButton from "$lib/components/AddButton.svelte";
  import ControlPanel from "$lib/components/ControlPanel.svelte";
  import Sample from "$lib/Sample.svelte";
  import Editor from "$lib/components/Editor.svelte";
  import {
    NoAudioTracksError,
    PermissionDeniedError,
    startAudioRecording,
  } from "$lib/recorder";
  import SampleStore from "$lib/store";

  export let mainStore;

  export let editing = [];
  export let editMode = false;

  $: noSamples = !$mainStore?.samples.length;

  let stopRecording = null;

  async function onRecord() {
    const recorder = startAudioRecording();
    stopRecording = recorder.stop;
    recorder.buffer
      .then((buf) => {
        stopRecording = null;
        if (buf === null) {
          alert("ONLY SILENCE");
        } else {
          const { id } = SampleStore.createNewSample(buf, "whoa");
          $mainStore.samples = $mainStore.samples.concat(id);
        }
      })
      .catch((e) => {
        stopRecording = null;
        if (e instanceof PermissionDeniedError) {
          alert("Permission DENIED");
        } else if (e instanceof NoAudioTracksError) {
          alert("NO AUDIO DAMMIT");
        } else {
          throw e;
        }
      });
  }
</script>

<Grid>
  <ControlPanel>
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    >

    <AddButton
      slot="addButton"
      options={[
        stopRecording
          ? { text: "Stop", icon: "stop", onClick: stopRecording }
          : { text: "Record Desktop", icon: "mic", onClick: onRecord },
      ]}
    />
    <Button
      slot="editButton"
      color={editMode ? "primary" : "secondary"}
      style="width: 80px"
      disabled={noSamples}
      on:click={() => (editMode = !editMode)}
    >
      <Icon class="material-icons">{editMode ? "done" : "content_cut"}</Icon>
      <Label style="padding-top: 2px">{editMode ? "Done" : "Edit"}</Label>
    </Button>
    <Button slot="searchButton" color="secondary" disabled={noSamples}>
      <Icon class="material-icons">search</Icon>
      <Label>Search</Label>
    </Button>
  </ControlPanel>
  <!-- <slot name="samples" /> -->
  {#if $mainStore}
    {#each $mainStore.samples as id (id)}
      {#if editing.includes(id)}
        <Editor
          {id}
          on:close={() => (editing = editing.filter((i) => i !== id))}
        />
      {:else}
        <Sample
          {id}
          {editMode}
          on:delete={() =>
            ($mainStore.samples = $mainStore.samples.filter((i) => i !== id))}
          on:edit={() => (editing = editing.concat(id))}
        />
      {/if}
    {/each}
  {/if}
</Grid>

<style>
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
