<script>
  import Button, { Label, Group, GroupItem, Icon } from "@smui/button";
  import Menu from "@smui/menu";
  import List, { Item, Text, Graphic } from "@smui/list";

  export let icon = "";
  export let text = "";
  export let className;
  let menuOpen = false;
  let anchor;
  $: console.log(menuOpen);
  let menu;
</script>

<div class="root">
  <Group variant="raised">
    <Button on:click={() => clicked++} variant="raised" color="secondary">
      <Icon class="material-icons">add</Icon>
      <Label style="padding-top: 2px">Add Sample</Label>
    </Button>
    <Button
      on:click={() => menu.setOpen(true)}
      variant="raised"
      color="secondary"
      style="padding: 0; min-width: 36px;"
    >
      <Icon class="material-icons" style="margin: 0;">arrow_drop_down</Icon>
    </Button>
  </Group>
  <Menu class="menu" bind:this={menu} anchorCorner="BOTTOM_LEFT">
    <List>
      <Item on:SMUI:action={() => clicked++} class="text">
        <Graphic class="material-icons">mic</Graphic>
        Record desktop
      </Item>
      <Item on:SMUI:action={() => clicked++}>
        <Text>Thing 2</Text>
      </Item>
      <Item on:SMUI:action={() => clicked++}>
        <Text>Thing 3</Text>
      </Item>
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
</style>
