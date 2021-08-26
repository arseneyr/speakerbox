<script>
  import MainScreen from "./MainScreen.svelte";
  import { initialize, mainStore, SampleStore } from "$lib/store";
  import { localForage } from "$lib/backend";
  import Layout from "./Layout.svelte";
  import longSample from "./stories/long_sample.mp3";
  import { waitForValue } from "$lib/utils";

  navigator.storage.persist().then((done) => !done && alert("Not persistent!"));
  initialize(localForage);
  if (import.meta.env.DEV) {
    Promise.all([
      fetch(longSample).then((r) => r.arrayBuffer()),
      waitForValue(mainStore),
    ]).then(([buf]) =>
      mainStore.update((store) => ({
        ...store,
        samples: Array.from(
          { length: 5 },
          (_, i) => SampleStore.createNewSample(buf, `Test Sample #${i}`).id
        ),
      }))
    );
  }
</script>

<Layout><MainScreen /></Layout>
