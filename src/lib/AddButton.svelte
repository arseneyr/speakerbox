<script>
  import Button, { Label, Group, GroupItem, Icon } from "@smui/button";
  import Menu from "@smui/menu";
  import List, { Item, Text, Graphic } from "@smui/list";
  import { afterUpdate, tick } from "svelte";

  interface Option {
    icon: string;
    text: string;
    onClick: () => void;
  }

  export let options: Option[] = [];
  $: mainButton = options[0];
  let menuOpen = false;
  let anchor;
  let downButtonHandler = () => {
    menuOpen = true;
  };
  $: if (menuOpen) {
    downButtonHandler = undefined;
  }
</script>

<div class="root">
  <Group variant="raised">
    <Button on:click={mainButton.onClick} variant="raised" color="secondary">
      <Icon class="material-icons">{mainButton.icon}</Icon>
      <Label style="padding-top: 2px">{mainButton.text}</Label>
    </Button>
    {#if options.length > 1}
      <Button
        on:click={downButtonHandler}
        variant="raised"
        color="secondary"
        style="padding: 0; min-width: 36px;"
      >
        <Icon
          class={`material-icons dropdown-arrow ${menuOpen ? "menu-open" : ""}`}
          style="margin: 0;">arrow_drop_down</Icon
        >
      </Button>
    {/if}
  </Group>
  <Menu
    class="menu"
    bind:open={menuOpen}
    anchorCorner="BOTTOM_LEFT"
    on:MDCMenuSurface:closed={() =>
      tick().then(() => {
        downButtonHandler = () => {
          menuOpen = true;
        };
      })}
  >
    <List>
      {#each options.slice(1) as option (option.text)}
        <Item class="text" on:SMUI:action={option.onClick}>
          <Graphic class="material-icons">{option.icon}</Graphic>
          {option.text}
        </Item>
      {/each}
    </List>
  </Menu>
</div>

<style>
  /* /* @use "../theme.scss"; */
  @use '@material/typography/index' as typography;

  .root {
    display: inline-block;
  }
  .root :global(.menu) {
    width: 100%;
    margin-top: 4px;
  }
  .root :global(.menu > ul) {
    padding-bottom: 0px;
  }
  /* button {
    width: 100%;
    background-color: theme.$lighterColor;
    color: theme.$darkColor;
    cursor: pointer;
    border: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    user-select: none;
  }
  button :global(.icon) {
    padding: 14px 0px;
    font-weight: bold;
  } */
  .root :global(.text) {
    @include typography.typography("button");
    padding-left: 10px;
    padding-right: 0;
  }
  .root :global(.text > .material-icons) {
    margin-right: 8px;
  }

  .root :global(.dropdown-arrow) {
    transition: transform 200ms ease-in-out;
  }
  .root :global(.dropdown-arrow.menu-open) {
    transform: rotate(180deg);
  }
</style>
