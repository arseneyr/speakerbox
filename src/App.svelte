<script context="module" lang="ts">
  import { GDriveBackend } from "$lib/backend/gdrive";

  export function getGDrive() {
    return getContext<GDriveBackend | undefined>("gdrive");
  }
</script>

<script lang="ts">
  import MainScreen from "./MainScreen.svelte";
  import { MainStore, SampleStore, setMainStore } from "$lib/store";
  import longSample from "./stories/long_sample.mp3";
  import { waitForValue } from "$lib/utils";
  import { getContext, setContext } from "svelte";
  import type { StorageBackend } from "$lib/types";

  export let backend: StorageBackend;
  backend instanceof GDriveBackend && setContext("gdrive", backend);
  const mainStore = new MainStore(backend);
  setMainStore(mainStore);

  if (import.meta.env.DEV) {
    (async function loadTestData() {
      const samples = await waitForValue(mainStore.samples);
      if (samples.length === 0) {
        const data = await (await fetch(longSample)).arrayBuffer();
        Array.from({ length: 5 }, (_, i) =>
          mainStore.append(
            new SampleStore({ data, title: `Test Sample #${i}` })
          )
        );
      }
    })();
  }
</script>

{#await mainStore.init() then _}
  <MainScreen />
{/await}
