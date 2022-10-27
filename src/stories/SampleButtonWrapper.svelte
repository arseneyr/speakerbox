<script lang="ts">
  import { createMSEPlayer } from "$lib/player";
  import SampleButton from "../components/SampleButton.svelte";
  import webm from "./assets/sample.webm";

  export let sampleUrl = webm;

  const playerPromise = fetch(sampleUrl)
    .then((b) => b.arrayBuffer())
    .then((buf) =>
      createMSEPlayer(buf.slice(0, 64 * 1024), () => buf.slice(64 * 1024))
    );

  let startTime: null = null;
  let iconButton = null;
  export let durationMs: number | null = null;
  export let title = "";
  let timer = null;
</script>

{#await playerPromise then player}
  <SampleButton
    {title}
    {startTime}
    {durationMs}
    on:click={() => {
      player.play();
      // startTime = Date.now();
      // timer && clearTimeout(timer);
      // timer = setTimeout(() => {
      //   iconButton = null;
      //   timer = null;
      // }, durationMs);
      // iconButton = {
      //   icon: "stop",
      //   onClick: () => {
      //     timer && clearTimeout(timer);
      //     timer = null;
      //     iconButton = null;
      //     startTime = null;
      //   },
      // };
    }}
  />
{/await}
