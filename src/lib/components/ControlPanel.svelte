<script>
  import Button, { Icon } from "@smui/button/styled";
  import logo from "../../../static/logo.svg";
  import VizPanel from "./VizPanel.svelte";
</script>

<div class="root">
  <div class="left">
    <img src={logo} width="200px" />
    <div class="underLogo">
      <slot name="link" />
    </div>
  </div>
  <VizPanel />
  <div class="buttons">
    <slot name="addButton" />
    <div class="buttonsBottom">
      <slot name="searchButton" />
      <slot name="editButton" />
    </div>
  </div>
</div>

<style>
  @use 'smui-theme' as theme;
  img {
    max-width: 100%;
  }
  .buttons {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    height: 100%;
  }
  .buttonsBottom {
    margin-top: 4px;
    display: flex;
    & > :global(:first-child) {
      margin: 0px 4px;
    }
  }
  .root {
    /* background-color: aqua; */
    width: 100%;
    height: 100%;
    padding: 4px 8px 0px 8px;
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
