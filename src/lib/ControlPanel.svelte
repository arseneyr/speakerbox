<script>
  import Button, { Label, Icon } from "@smui/button";
</script>

<div class="root">
  <!-- <AddButton className="add-button" icon="add" text="Add Media File" /> -->
  <Button variant="raised" color="secondary" class="huh">
    <Icon class="material-icons">add</Icon>
    <Label style="padding-top: 2px">Add</Label>
  </Button>
  <Button color="secondary" class="huh">
    <Icon class="material-icons">edit</Icon>
    <Label style="padding-top: 2px">Edit</Label>
  </Button>
</div>

<style>
  .root {
    /* background-color: aqua; */
    width: 100%;
    height: 100%;
  }

  .root > :global(.add-button) {
    width: 50%;
  }
</style>
