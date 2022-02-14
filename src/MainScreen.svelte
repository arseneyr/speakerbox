<script lang="ts">
  import Button, { Icon, Label } from "@smui/button";
  import Grid from "./components/Grid.svelte";
  import ControlPanel from "./components/ControlPanel.svelte";
  import Sample from "./Sample.svelte";
  import Editor from "./components/Editor.svelte";
  import { getMainStore, SampleStore } from "$lib/store";
  import NewSampleButton from "./components/NewSampleButton.svelte";
  import Snackbar, { Actions } from "@smui/snackbar";
  import { getGDrive } from "./App.svelte";
  import { readable } from "svelte/store";

  export let editing = new Set<string>();
  export let editMode = false;

  let newSamples: SampleStore[] = [];

  const mainStore = getMainStore()!;
  const gDrive = getGDrive();
  // const signIn = gDrive?.signIn ?? (() => alert("noooo"));
  $: isSignedIn = gDrive?.isSignedIn ?? readable(false);
  const { samples } = mainStore;

  $: noSamples = !$samples?.length;

  function onNewSamples({ detail }: CustomEvent<SampleStore[]>) {
    newSamples = detail.concat(newSamples);
  }
  function signIn() {
    gDrive ? gDrive.signIn() : alert("noooooo");
  }

  let snackbar: any;
  let undoDelete: { undo: () => void; delete: () => void } | undefined;
  function onDelete(id: string) {
    if (snackbar?.isOpen()) {
      snackbar?.close();
      undoDelete?.delete();
    }
    undoDelete = mainStore.remove(id);
    snackbar?.open();
  }
  function onSnackbarClose(event: CustomEvent<{ reason: string }>) {
    if (event.detail.reason === "action") {
      undoDelete?.undo();
      undoDelete = undefined;
    } else if (event.detail.reason === "dismiss") {
      undoDelete?.delete();
      undoDelete = undefined;
    }
  }
</script>

<Grid>
  <ControlPanel>
    <svelte:fragment slot="link">
      {#if gDrive}
        {#if !$isSignedIn}<a
            class="gDriveLabel"
            href="javascript:;"
            on:click={signIn}>Sync with Google Drive</a
          >
        {:else}
          <span class="gDriveLabel">Synced with Google Drive</span>
        {/if}
      {/if}
    </svelte:fragment>
    <NewSampleButton slot="addButton" on:newSamples={onNewSamples} />

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
  {#each newSamples as sampleStore (sampleStore.id)}
    <Editor
      {sampleStore}
      on:save={() => {
        mainStore.prepend(sampleStore);
      }}
      on:close={() => {
        newSamples = newSamples.filter(({ id }) => id !== sampleStore.id);
      }}
    />
  {/each}
  {#if $samples}
    {#each $samples as sample (sample.id)}
      {#if editing.has(sample.id)}
        <Editor
          sampleStore={sample}
          on:close={() => {
            editing.delete(sample.id);
            editing = editing;
          }}
        />
      {:else}
        <Sample
          sampleStore={sample}
          {editMode}
          on:delete={() => onDelete(sample.id)}
          on:edit={() => {
            editing.add(sample.id);
            editing = editing;
          }}
        />
      {/if}
    {/each}
  {/if}
</Grid>
<Snackbar
  bind:this={snackbar}
  timeoutMs={8000}
  surface$class="snackbarSurface"
  on:MDCSnackbar:closed={onSnackbarClose}
>
  <Label>Sample Deleted</Label>
  <Actions>
    <!-- <IconButton class="material-icons">close</IconButton> -->
    <Button>Undo</Button>
  </Actions>
</Snackbar>

<style lang="scss">
  @use "theme";
  // @use "@material/typography/index" as typography;

  :global(.snackbarSurface) {
    background-color: theme.$mainColor;
  }
  :global(.snackbarSurface > span) {
    color: white;
  }
  // .gDriveLabel {
  //   @include typography.typography("subtitle2");
  // }
</style>
