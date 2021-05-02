<script>
  import Button, { Icon, Label } from "@smui/button/styled";
  import Grid from "$lib/components/Grid.svelte";
  import AddButton from "$lib/components/AddButton.svelte";
  import ControlPanel from "$lib/components/ControlPanel.svelte";
</script>

<Grid>
  <!-- <AddButton /> -->
  <ControlPanel slot="panel">
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    >

    <AddButton
      slot="addButton"
      options={[{ text: "Add Sample", icon: "add" }]}
    />
    <Button slot="editButton" color="secondary">
      <Icon class="material-icons">content_cut</Icon>
      <Label style="padding-top: 2px">Edit</Label>
    </Button>
    <Button slot="searchButton" color="secondary">
      <Icon class="material-icons">search</Icon>
      <Label>Search</Label>
    </Button>
  </ControlPanel>
  <slot name="samples" />
</Grid>

<style>
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
