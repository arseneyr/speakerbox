<svelte:options immutable={true} />

<script context="module">
  // Some dark magic here: Chromium will suspend audio elements
  // after some time and trying to play results in a short delay.
  // For some reason, creating audio contexts prevents this.
  new AudioContext();
  setInterval(() => new AudioContext(), 10000);
</script>

<script>
  import SampleButton from "$lib/components/SampleButton.svelte";
  import SampleStore from "$lib/store";

  export let id;

  let startTime;

  const { title, paused, loading, player, duration } = SampleStore.getSample(
    id
  );
  $: durationMs = $duration && $duration * 1000;
</script>

{#if !$loading && $player}
  <SampleButton
    title={$title}
    duration={durationMs}
    loading={$loading}
    {startTime}
    on:click={() => {
      startTime = Date.now();
      // We would rather do a bind:currentTime but it seems to skip
      // activation sometimes. Perhaps a result of svelte batching?
      $player.play();
      $paused = false;
    }}
    iconButton={!$paused
      ? {
          icon: "stop",
          onClick: () => {
            $paused = true;
            $player.stop();
            startTime = undefined;
          },
        }
      : undefined}
  />
{/if}
