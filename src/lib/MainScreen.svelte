<script>
  import Grid from "./Grid.svelte";
  import AddButton from "./AddButton.svelte";
  import Sample from "./Sample.svelte";
  import ControlPanel from "./ControlPanel.svelte";
</script>

<Grid>
  <!-- <AddButton /> -->
  <ControlPanel
    slot="panel"
    addOptions={[{ text: "Add Sample", icon: "add" }]}
  />
  <slot name="samples" />
</Grid>
