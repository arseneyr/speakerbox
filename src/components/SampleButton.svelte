<script lang="ts">
  import { onMount } from "svelte";

  // import WaveformData from "waveform-data";

  export let title: string = "";
  export let startTime: number | null = null;
  export let durationMs: number | null = null;
  export let loading = false;
  export let editMode = false;
  // export let waveform: WaveformData | undefined;

  let canvas: HTMLCanvasElement;

  let durationText: string | null;
  $: if (durationMs) {
    let hours = Math.floor(durationMs / 3600000);
    let mins = Math.floor((durationMs - hours * 3600000) / 60000);
    let secs = Math.floor((durationMs - hours * 3600000 - mins * 60000) / 1000);
    durationText =
      (hours > 0 ? hours.toString().padStart(2, "0") + ":" : "") +
      mins.toString().padStart(2, "0") +
      ":" +
      secs.toString().padStart(2, "0");
  } else {
    durationText = null;
  }
</script>

<button
  class="w-1/3 max-w-lg basis-1/3 flex-col overflow-hidden rounded bg-gray-900 text-slate-300 opacity-90 shadow-md transition hover:opacity-100 active:shadow-sm"
  on:mousedown
  on:mouseup
>
  <div
    class="w-full truncate text-ellipsis px-4 pt-1 pb-2 text-4xl leading-tight"
  >
    {title}
  </div>
  <div class="relative flex h-8 w-full items-center bg-gray-800 text-slate-300">
    <div
      class="flex h-full w-20 items-center justify-center rounded-r font-medium"
    >
      {durationText ?? ""}
    </div>

    <!-- <canvas bind:this={canvas} class="h-full grow" /> -->

    <button
      class="transition-color absolute inset-y-0 right-0 h-full w-10 rounded-l text-gray-50 opacity-70 transition-opacity  hover:bg-gray-500 hover:opacity-80 "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </button>
  </div>
</button>
