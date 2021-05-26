<script lang="ts">
  import Textfield from "@smui/textfield/styled";
  import Button, { Group, Icon } from "@smui/button/styled";
  import CloseButton from "$lib/components/CloseButton.svelte";
  import { onDestroy, onMount, tick } from "svelte";
  import Wavesurfer from "wavesurfer.js";
  import Regions from "wavesurfer.js/dist/plugin/wavesurfer.regions";
  import { get } from "svelte/store";
  import { getSample } from "$lib/store";
  import EditManager from "$lib/EditManager";

  export let id;

  const { paused, title, audioData } = getSample(id);

  const editManager = new EditManager();
  const { audioBuffer, undoable, redoable } = editManager;
  $: $audioData && editManager.loadData($audioData);

  $paused = true;

  let waveformEl;
  let wavesurfer;
  let region;
  let ready = false;

  let regionClose;

  let currentTitleValue = $title;
  let debounceTimer = null;
  function updateTitle() {
    $title = currentTitleValue;
    debounceTimer = null;
  }

  function debounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(updateTitle, 700);
  }
  onDestroy(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    updateTitle();
  });

  const commonHandleStyles = {
    backgroundColor: "#ebeee7",
    cursor: "pointer",
  };
  const regionConfig = {
    id: 0,
    color: "rgba(255,255,255,0.1)",
    handleStyle: {
      left: { ...commonHandleStyles },
      right: { ...commonHandleStyles },
    },
  };

  $: wavesurfer && $audioBuffer && wavesurfer.loadDecodedBuffer($audioBuffer);
  $: if (wavesurfer) {
    if ($paused && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    } else if (!$paused && !wavesurfer.isPlaying()) {
      wavesurfer.play();
    }
  }

  function onRegionClose() {
    regionClose.$destroy();
    region.remove();
    region = null;
    wavesurfer.enableDragSelection(regionConfig);
  }

  function onNewRegion(newRegion) {
    region = newRegion;
    wavesurfer.disableDragSelection();
    function onPlaybackLeave() {
      region.un("out", onPlaybackLeave);
      $paused = true;
    }
    region.handleLeftEl.addEventListener("click", (e) => {
      e.stopPropagation();
      region.play();
      $paused = false;
    });
    region.handleRightEl.addEventListener("click", (e) => {
      e.stopPropagation();
      region.un("out");
      region.on("out", onPlaybackLeave);
      wavesurfer.play(Math.max(region.end - 1, region.start), region.end);
      $paused = false;
    });
    regionClose = new CloseButton({
      target: region.element,
    });
    regionClose.$on("click", (event) => {
      event.stopPropagation();
      onRegionClose();
    });
  }

  function onEdit(type: "cut" | "crop") {
    if (type === "cut") {
      editManager.cut(region.start, region.end);
    } else if (type === "crop") {
      editManager.crop(region.start, region.end);
    }
    wavesurfer.stop();
    $paused = true;
    onRegionClose();
  }

  async function onUndo() {
    wavesurfer.stop();
    $paused = true;
    const action = editManager.undo();
    // await tick();
    if (action) {
      if (region) {
        region.start = action.start;
        region.end = action.end;
      } else {
        onNewRegion(
          wavesurfer.addRegion({
            ...regionConfig,
            start: action.start,
            end: action.end,
          })
        );
      }
    }
  }
  function onRedo() {
    wavesurfer.stop();
    $paused = true;
    region && onRegionClose();
    editManager.redo();
  }

  onMount(() => {
    wavesurfer = Wavesurfer.create({
      container: waveformEl,
      responsive: true,
      plugins: [Regions.create()],
    });

    // wavesurfer uses scrollWidth for progress calculations. Since the region
    // is a child of the waveform, the region handles get included in scrollWidth
    // even though there is no waveform past the end of the region
    wavesurfer.drawer.wrapper = new Proxy(wavesurfer.drawer.wrapper, {
      get(target, prop) {
        if (prop === "scrollWidth") {
          return target.clientWidth;
        }
        return target[prop];
      },
    });

    wavesurfer.on("ready", () => {
      ready = true;
      wavesurfer.enableDragSelection(regionConfig);
      wavesurfer.on("region-created", () =>
        wavesurfer.on("region-update-end", (r) => {
          wavesurfer.un("region-update-end");
          onNewRegion(r);
        })
      );
      wavesurfer.on("finish", () => {
        $paused = true;
        wavesurfer.stop();
      });
      wavesurfer.un("ready");
    });

    return () => wavesurfer.destroy();
  });
</script>

<div class="root" class:playing={!$paused}>
  <Textfield
    bind:value={currentTitleValue}
    on:input={debounce}
    class="title"
    input$spellcheck="false"
    input$autocomplete="off"
    input$autocorrect="off"
    input$autocapitalize="off"
  />
  <div class="waveform" bind:this={waveformEl} />
  <div class="buttonPanel">
    <Group variant="outlined" disabled={!ready}>
      <Button
        variant="outlined"
        color="secondary"
        on:click={() => ($paused = !$paused)}
        disabled={!ready}
      >
        {#if $paused}
          <Icon class="material-icons">play_arrow</Icon>
        {:else}
          <Icon class="material-icons">pause</Icon>
        {/if}
      </Button>
    </Group>
    <Group variant="outlined">
      <Button
        variant="outlined"
        color="secondary"
        disabled={!region}
        on:click={() => onEdit("cut")}
        ><Icon class="material-icons">content_cut</Icon>
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        disabled={!region}
        on:click={() => onEdit("crop")}
        ><Icon class="material-icons">crop</Icon>
      </Button>
    </Group>
    <Group variant="outlined">
      <Button
        variant="outlined"
        color="secondary"
        disabled={!$undoable}
        on:click={onUndo}
        ><Icon class="material-icons">undo</Icon>
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        disabled={!$redoable}
        on:click={onRedo}
        ><Icon class="material-icons">redo</Icon>
      </Button>
    </Group>
  </div>
</div>

<style lang="scss">
  @use '@material/typography/index' as typography;
  @use '@material/icon-button/index' as icon-button;

  .root {
    width: 100%;
    background-color: #111111;
    display: flex;
    flex-direction: column;
    padding: 0px 24px 24px 24px;
    box-sizing: border-box;
  }
  .root > :global(.title) {
    margin-bottom: 16px;
    width: 40%;
    min-width: 300px;
  }
  .root > :global(.title > input) {
    @include typography.typography("headline5");
  }
  .waveform > :global(wave) {
    overflow: unset !important;
  }
  .root :global(.wavesurfer-region) {
    z-index: 4 !important;
    position: relative;
  }

  :root :global(.wavesurfer-region > button) {
    @include icon-button.density(-5);
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .root :global(.wavesurfer-handle::before) {
    content: "";
    font-family: "Material Icons";
    color: black;
    display: inline-flex;
    width: 24px;
    height: 48px;
    background-color: #ebeee7;
    position: absolute;
    top: 50%;
    margin-top: -24px;
    justify-content: center;
    align-items: center;
  }
  @mixin handle($side) {
    border-top-#{$side}-radius: 24px;
    border-bottom-#{$side}-radius: 24px;
    margin-#{$side}: -23px;
  }

  .root :global(.wavesurfer-handle-start::before) {
    @include handle(left);
  }
  .root :global(.wavesurfer-handle-end::before) {
    @include handle(right);
  }

  .buttonPanel {
    display: flex;
    margin-top: 8px;
    justify-content: space-between;

    :global(button) {
      min-width: 16px;
    }

    :global(button i) {
      margin: 0px;
    }
  }
</style>
