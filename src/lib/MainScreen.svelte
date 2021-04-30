<script>
  import Grid from "./Grid.svelte";
  import AddButton from "./AddButton.svelte";
  import Sample from "./Sample.svelte";
  import ControlPanel from "./ControlPanel.svelte";
</script>

<Grid>
  <!-- <AddButton /> -->
  <ControlPanel slot="panel" addOptions={[{ text: "Add Sample", icon: "add" }]}>
    <a slot="link" href="javascript:;" on:click={() => alert("yo")}
      >Sync with Google Drive</a
    ></ControlPanel
  >
  <slot name="samples" />
</Grid>

<style>
  @use '@material/typography/index' as typography;
  a {
    @include typography.typography("subtitle2");
  }
</style>
