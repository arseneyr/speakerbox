<script>
  import Button, { Icon, Label } from "@smui/button/styled";
  import Grid from "$lib/components/Grid.svelte";
  import AddButton from "$lib/components/AddButton.svelte";
  import ControlPanel from "$lib/components/ControlPanel.svelte";
  import Sample from "$lib/Sample.svelte";
  import Editor from "$lib/components/Editor.svelte";

  export let mainStore;

  let editing = [];
  let editMode = false;
</script>

<Grid>
  <ControlPanel slot="panel">
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    >

    <AddButton
      slot="addButton"
      options={[{ text: "Add Sample", icon: "add", onClick: () => {} }]}
    />
    <Button
      slot="editButton"
      color={editMode ? "primary" : "secondary"}
      style="width: 80px"
      on:click={() => (editMode = !editMode)}
    >
      <Icon class="material-icons">{editMode ? "done" : "content_cut"}</Icon>
      <Label style="padding-top: 2px">{editMode ? "Done" : "Edit"}</Label>
    </Button>
    <Button slot="searchButton" color="secondary">
      <Icon class="material-icons">search</Icon>
      <Label>Search</Label>
    </Button>
  </ControlPanel>
  <!-- <slot name="samples" /> -->
  {#each $mainStore.samples as id (id)}
    {#if editing.includes(id)}
      <Editor {id} />
    {:else}
      <Sample
        {id}
        {editMode}
        on:delete={() =>
          ($mainStore.samples = $mainStore.samples.filter((i) => i !== id))}
      />
    {/if}
  {/each}
</Grid>

<style>
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
