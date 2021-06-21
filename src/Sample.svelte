<svelte:options immutable={true} />

<script context="module">
  // Some dark magic here: Chromium will suspend audio elements
  // after some time and trying to play results in a short delay.
  // For some reason, creating audio contexts prevents this.
  new AudioContext();
  setInterval(() => new AudioContext(), 10000);
</script>

<script>
  import SampleButton from "./components/SampleButton.svelte";
  import { SampleStore } from "$lib/store";
  import { createEventDispatcher } from "svelte";

  export let id;
  export let editMode = false;

  const dispatch = createEventDispatcher();
  let startTime;

  const {
    playing,
    title,
    loading,
    player: playerStore,
    duration,
  } = SampleStore.getSample(id);

  // Important to keep a long running player subscription. Otherwise,
  // the player gets destroyed and recreated on every click
  $: player = $playerStore;

  $: durationMs = $duration && $duration * 1000;
  $: if (!$playing) {
    startTime = undefined;
  }
</script>

<SampleButton
  title={$title}
  duration={durationMs}
  loading={$loading}
  {startTime}
  {editMode}
  on:click={() => {
    if (editMode) {
      dispatch("edit");
    } else {
      startTime = Date.now();
      player && player.play();
    }
  }}
  iconButton={editMode
    ? { icon: "delete", onClick: () => dispatch("delete") }
    : $playing
    ? {
        icon: "stop",
        onClick: () => {
          player && player.stop();
        },
      }
    : undefined}
/>
