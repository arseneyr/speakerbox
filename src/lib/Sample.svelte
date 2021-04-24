<svelte:options immutable={true} />

<script context="module">
  // Some dark magic here: Chromium will suspend audio elements
  // after some time and trying to play results in a short delay.
  // For some reason, creating audio contexts prevents this.
  setInterval(() => new AudioContext(), 10000);
</script>

<script>
  import SampleButton from "./SampleButton.svelte";
  import { getSample } from "./store";

  export let id = "";

  let startTime;
  let duration;

  let audioElement;

  const { title, paused, audioData, loading } = getSample(id);
  $: src = $audioData ? URL.createObjectURL(new Blob([$audioData])) : undefined;
  $: durationMs = duration * 1000;

  $: console.log(src);
</script>

{#if !$loading && src}
  <audio bind:duration {src} bind:paused={$paused} bind:this={audioElement} />
  <SampleButton
    title={$title}
    duration={durationMs}
    {startTime}
    on:click={() => {
      startTime = Date.now();
      // We would rather do a bind:currentTime but it seems to skip
      // activation sometimes. Perhaps a result of svelte batching?
      audioElement.currentTime = 0;
      $paused = false;
    }}
    iconButton={!$paused
      ? {
          icon: "stop",
          onClick: () => {
            $paused = true;
            audioElement.currentTime = 0;
            startTime = undefined;
          },
        }
      : undefined}
  />
{/if}
