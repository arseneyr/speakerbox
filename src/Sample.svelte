<svelte:options immutable={true} />

<script context="module">
  // Some dark magic here: Chromium will suspend audio elements
  // after some time and trying to play results in a short delay.
  // For some reason, creating audio contexts prevents this.
  // new AudioContext();
  // setInterval(() => new AudioContext(), 10000);
</script>

<script lang="ts">
  import SampleButton from "./components/SampleButton.svelte";
  import type { SampleStore } from "$lib/store";
  import { createEventDispatcher } from "svelte";
  import { readable } from "svelte/store";

  export let sampleStore: SampleStore;
  export let editMode = false;

  const dispatch = createEventDispatcher();
  let startTime: number | null = null;

  const { title, player } = sampleStore;
  $: playing = $player?.playing ? $player.playing : readable(false);

  // Important to keep a long running player subscription. Otherwise,
  // the player gets destroyed and recreated on every click
  // $: player = $playerStore;

  $: durationMs = $player && $player.duration * 1000;
  $: if (!$playing) {
    startTime = null;
  }
</script>

<SampleButton
  title={$title ?? undefined}
  {durationMs}
  loading={!$player}
  {startTime}
  {editMode}
  on:click={() => {
    if (editMode) {
      dispatch("edit");
    } else {
      startTime = Date.now();
      $player?.play();
    }
  }}
  iconButton={editMode
    ? { icon: "delete", onClick: () => dispatch("delete") }
    : $playing
    ? {
        icon: "stop",
        onClick: () => $player?.stop(),
      }
    : undefined}
/>
