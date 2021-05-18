<script>
  import { getSample } from "$lib/store";

  import Textfield from "@smui/textfield/styled";
  import { onMount } from "svelte";
  import Wavesurfer from "wavesurfer.js";
  import Regions from "wavesurfer.js/dist/plugin/wavesurfer.regions";

  export let id;

  const { title, paused, audioData } = getSample(id);

  let waveformEl;
  let wavesurfer;
  let region;

  $paused = true;

  const commonHandleStyles = {
    backgroundColor: "#ebeee7",
    cursor: "col-resize",
  };

  $: wavesurfer && $audioData && wavesurfer.loadBlob(new Blob([$audioData]));
  $: wavesurfer && $paused && wavesurfer.pause();
  onMount(() => {
    wavesurfer = Wavesurfer.create({
      container: waveformEl,
      interact: false,
      cursorWidth: 0,
      responsive: true,
      plugins: [Regions.create()],
    });

    wavesurfer.on("ready", () => {
      region = wavesurfer.addRegion({
        id: 0,
        end: wavesurfer.getDuration(),
        drag: false,
        color: "rgba(255,255,255,0.1)",
        handleStyle: {
          left: { ...commonHandleStyles },
          right: { ...commonHandleStyles },
        },
      });
      wavesurfer.enableDragSelection({});
      let { start, end } = region;
      wavesurfer.on("pause", () => ($paused = true));
      region.on("click", () => {
        $paused = false;
        region.play();
      });
      region.handleLeftEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if ($paused) {
          $paused = false;
          region.play();
        } else {
          $paused = true;
          wavesurfer.pause();
        }
      });
      region.handleRightEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if ($paused) {
          $paused = false;
          wavesurfer.play(Math.max(region.end - 1, region.start), region.end);
        } else {
          $paused = true;
          wavesurfer.pause();
        }
      });
      region.on("update-end", () => {
        if (!$paused) {
          if (region.start !== start) {
            region.play();
          } else if (region.end !== end) {
            wavesurfer.play(Math.max(region.end - 1, region.start), region.end);
          }
        }
        start = region.start;
        end = region.end;
      });
    });

    return () => wavesurfer.destroy();
  });
</script>

<div class="root" class:playing={!$paused}>
  <Textfield
    bind:value={$title}
    class="title"
    input$spellcheck="false"
    input$autocomplete="off"
    input$autocorrect="off"
    input$autocapitalize="off"
  />
  <div class="waveform" bind:this={waveformEl} />
</div>

<style>
  @use '@material/typography/index' as typography;

  .root {
    /* height: 200px; */
    width: 100%;
    background-color: #111111;
    display: flex;
    flex-direction: column;
    padding: 0px 24px 24px 24px;
    box-sizing: border-box;
  }
  .root > :global(.title) {
    /* margin: 0px 24px; */
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
    /* background-color: rgba(255, 255, 255, 0.1) !important; */
    z-index: 4 !important;
  }

  .root :global(.wavesurfer-handle::before) {
    content: "play_arrow";
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
  .root.playing :global(.wavesurfer-handle::before) {
    content: "pause";
  }
</style>
