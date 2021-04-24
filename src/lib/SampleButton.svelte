<script>
  import Ripple from "@smui/ripple";
  import IconButton from "@smui/icon-button";
  import { fade, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  export let title: string = "";
  export let startTime: number | null = null;
  export let duration: number | null = null;

  export let iconButton:
    | { icon: string; onClick: () => void }
    | undefined = undefined;

  let transition;
  let outDuration;

  $: {
    const timeRemaining =
      startTime && duration ? duration - (Date.now() - startTime) : 0;

    transition = timeRemaining > 0 ? { duration: timeRemaining } : null;
    outDuration = 0;
  }

  function grow(node, { duration }) {
    return {
      duration,
      css: (t) => `clip-path: inset(0 ${100 - t * 100}% 0 0)`,
    };
  }
</script>

<div class="root">
  <button use:Ripple={{ surface: true }} on:click on:mouseover>
    <div class="title">{title}</div>
    <!-- The #key block forcefully remounts when the props change or after outro
       The #if block will dismount only when the intro fully plays -->

    <div class="progressPlaceholder" />
    {#key transition}
      {#if transition && outDuration === 0}
        <div
          class="progressBar progressPlaceholder"
          in:grow={transition}
          on:introstart={() => (outDuration = 0)}
          on:introend={() => {
            outDuration = 200;
          }}
          on:outroend={() => {
            transition = null;
            outDuration = 0;
          }}
          out:fade|local={{ duration: outDuration }}
        />
      {/if}
    {/key}
  </button>
  {#if iconButton && iconButton.icon}
    <div
      in:scale={{ duration: 200, easing: backOut }}
      out:fade={{ duration: 100 }}
      class="iconButtonWrapper"
    >
      <IconButton
        class="material-icons iconButton"
        on:click={(evt) => {
          evt.stopPropagation();
          iconButton.onClick();
        }}>{iconButton.icon}</IconButton
      >
    </div>
  {/if}
</div>

<style>
  @use "../theme.scss";
  div.root {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0px;
  }

  .iconButtonWrapper {
    position: absolute;
    top: -4px;
    right: -4px;
  }
  div.root :global(.iconButton) {
    background-color: theme.$lighterColor;
    color: theme.$darkColor;
    width: unset;
    height: unset;
    font-size: 20px;
    padding: 4px;
    border-radius: 15px;
  }
  div.title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    padding: 4px 8px 4px 8px;
    box-sizing: border-box;
  }
  button {
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    background-color: theme.$mainColor;
    width: 100%;
    cursor: pointer;
    color: theme.$lightTextColor;
    font: theme.$sampleFont;
    position: relative;
    user-select: none;
    height: 100%;
  }

  div.progressPlaceholder {
    width: 100%;
    height: 8px;
  }

  div.progressBar {
    background: theme.$progressColor;
    position: absolute;
    bottom: 0;
  }
</style>
