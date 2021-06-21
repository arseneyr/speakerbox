<script lang="ts">
  import Button, { Icon, Label } from "@smui/button/styled";
  import Grid from "./components/Grid.svelte";
  import ControlPanel from "./components/ControlPanel.svelte";
  import Sample from "./Sample.svelte";
  import Editor from "./components/Editor.svelte";
  import { mainStore } from "$lib/store";
  import NewSampleButton from "./NewSampleButton.svelte";

  export let editing = [];
  export let editMode = false;

  $: noSamples = !$mainStore?.samples.length;
</script>

<Grid>
  <ControlPanel>
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    >
    <NewSampleButton
      slot="addButton"
      on:newSamples={({ detail }) => (editing = detail.concat(editing))}
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

<style lang="scss">
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
