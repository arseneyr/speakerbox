<script lang="ts">
  import Button, { Icon, Label } from "@smui/button/styled";
  import Grid from "./components/Grid.svelte";
  import ControlPanel from "./components/ControlPanel.svelte";
  import Sample from "./Sample.svelte";
  import Editor from "./components/Editor.svelte";
  import { getMainStore, MainStore, SampleStore } from "$lib/store";
  import NewSampleButton from "./NewSampleButton.svelte";

  export let editing: string[] = [];
  export let editMode = false;

  let newSamples: SampleStore[] = [];

  const mainStore = getMainStore()!;
  const { samples } = mainStore;

  $: noSamples = !$samples?.length;

  function onNewSamples({ detail }: CustomEvent<SampleStore[]>) {
    newSamples = newSamples.concat(detail);
  }
</script>

<Grid>
  <ControlPanel>
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    >
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
      on:close={() => {
        mainStore.prepend(sampleStore);
        newSamples = newSamples.filter(({ id }) => id !== sampleStore.id);
      }}
    />
  {/each}
  {#if $samples}
    {#each $samples as sample (sample.id)}
      {#if editing.includes(sample.id)}
        <Editor
          sampleStore={sample}
          on:close={() => (editing = editing.filter((i) => i !== sample.id))}
        />
      {:else}
        <Sample
          sampleStore={sample}
          {editMode}
          on:delete={() =>
            $samples &&
            mainStore.update(
              $samples.map(({ id }) => id).filter((i) => i !== sample.id)
            )}
          on:edit={() => (editing = editing.concat(sample.id))}
        />
      {/if}
    {/each}
  {/if}
</Grid>

<style lang="scss">
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
