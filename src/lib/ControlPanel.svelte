<script>
  import Button, { Label, Icon } from "@smui/button/styled";
  import AddButton from "./AddButton.svelte";
  import IconButton from "@smui/icon-button/styled";
  import logo from "../../static/logo.svg";

  export let addOptions;
  export let searchBoxValue = "";
</script>

<div class="root">
  <div class="left">
    <img src={logo} width="200px" />
    <div class="underLogo">
      <Button color="secondary" class="settingsButton"
        ><Icon class="material-icons">settings</Icon></Button
      >
      <slot name="link" />
    </div>
  </div>
  <div class="buttons">
    <!-- <Textfield bind:value={searchBoxValue} label="Search">
      <InputIcon class="material-icons" slot="leadingIcon">search</InputIcon>
    </Textfield> -->
    <Button color="secondary">
      <Icon class="material-icons">search</Icon>
      <Label>Search</Label>
    </Button>
    <Button color="secondary" class="huh">
      <Icon class="material-icons">edit</Icon>
      <Label style="padding-top: 2px">Edit</Label>
    </Button>
    <AddButton options={addOptions} />
  </div>
</div>

<style>
  img {
    max-width: 100%;
  }
  .buttons {
    display: flex;
  }
  .buttons > :global(*) {
    margin-left: 8px;
  }
  .root {
    /* background-color: aqua; */
    width: 100%;
    height: 100%;
    padding: 4px 8px;
    display: flex;
    box-sizing: border-box;
    justify-content: space-between;
    align-items: flex-start;
  }

  /* .right {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    height: 100%;
  } */

  .left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .left :global(.settingsButton) {
    padding: 0;
    min-width: unset;
    width: 24px;
    height: 24px;
  }

  .left :global(.settingsButton > i) {
    color: var(--mdc-theme-on-surface);
    margin: 0;
  }

  .root > :global(.add-button) {
    width: 50%;
  }

  .underLogo {
    margin-top: 4px;
    & > :global(*) {
      color: var(--mdc-theme-on-surface);
    }
  }
</style>
