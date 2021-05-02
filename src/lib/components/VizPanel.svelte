<script>
  import Button, { Icon } from "@smui/button/styled";
</script>

<div class="root">
  <Button class="settingsButton" color="secondary">
    <Icon class="material-icons">settings</Icon>
  </Button>
</div>

<style>
  @use 'smui-theme' as theme;
  .root {
    height: 100%;
    width: 100%;
    border-radius: 8px;
    background-color: #111111;
    margin: 0px 16px;
    max-width: 300px;
    overflow: hidden;
  }
  .root > :global(.settingsButton) {
    padding: 0;
    min-width: unset;
    width: 24px;
    height: 24px;
  }

  .root :global(.settingsButton > i) {
    margin: 0;
    /* color: theme.$lighterColor; */
  }
</style>
