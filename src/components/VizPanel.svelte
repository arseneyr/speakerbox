<script>
  import { SampleStore, anyPlaying } from "$lib/store";

  import Button, { Icon } from "@smui/button/styled";

  export let volume = 1;
  let lastVolume = null;
</script>

<div class="root">
  <Button class="settingsButton smallButton" color="secondary">
    <Icon class="material-icons">settings</Icon>
  </Button>
  <div class="visualizer" />
  <div class="bottomButtons">
    <Button disabled={!$anyPlaying} on:click={() => SampleStore.stopAll()}>
      <Icon class="material-icons">stop</Icon>
      Stop
    </Button>
    <div>
      <input type="range" bind:value={volume} min={0} max={1} step={0.001} />
      <Button
        class="smallButton"
        color="secondary"
        ripple={false}
        on:click={() => {
          if (volume === 0) {
            volume = lastVolume || 1;
          } else {
            lastVolume = volume;
            volume = 0;
          }
        }}
      >
        <Icon class="material-icons"
          >{volume === 0 ? "volume_off" : "volume_up"}</Icon
        >
      </Button>
    </div>
  </div>
</div>

<style lang="scss">
  @use 'smui-theme' as theme;
  .root {
    height: 100%;
    width: 100%;
    border-radius: 8px;
    background-color: #111111;
    margin: 0px 16px;
    max-width: 300px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  @mixin track() {
  }
  input {
    width: 80px;
    vertical-align: middle;
    &::-webkit-slider-runnable-track {
      @include track;
    }
    &::-moz-range-track {
      @include track;
    }
  }
  .bottomButtons {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
  }
  .visualizer {
    flex-grow: 1;
  }
  .root :global(.smallButton) {
    padding: 0;
    min-width: unset;
    width: 24px;
    height: 24px;
  }
  .root > :global(.settingsButton) {
    position: absolute;
  }

  .root :global(.smallButton > i) {
    margin: 0;
    /* color: theme.$lighterColor; */
  }
</style>
