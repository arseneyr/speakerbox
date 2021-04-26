<script>
  import Button, { Label, Icon } from "@smui/button";
  import AddButton from "./AddButton.svelte";
  import logo from "../../static/logo.svg";

  export let addOptions;
</script>

<div class="root">
  <img src={logo} width="200px" />
  <!-- <AddButton className="add-button" icon="add" text="Add Media File" /> -->
  <AddButton options={addOptions} />
  <Button color="secondary" class="huh">
    <Icon class="material-icons">edit</Icon>
    <Label style="padding-top: 2px">Edit Sample</Label>
  </Button>
</div>

<style>
  .root {
    /* background-color: aqua; */
    width: 100%;
    height: 100%;
    padding: 4px 8px;
  }

  .root > :global(.add-button) {
    width: 50%;
  }
</style>
