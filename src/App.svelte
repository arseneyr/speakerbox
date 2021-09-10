<script>
  import MainScreen from "./MainScreen.svelte";
  import { MainStore, SampleStore, setMainStore } from "$lib/store";
  import { localForage } from "$lib/backend";
  import Layout from "./Layout.svelte";
  import longSample from "./stories/long_sample.mp3";
  import { waitForValue } from "$lib/utils";

  // const backend = localForage();
  const mainStore = new MainStore(localForage());
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
  <Layout><MainScreen /></Layout>
{/await}
