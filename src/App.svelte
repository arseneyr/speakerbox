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
    fetch(longSample)
      .then((r) => r.arrayBuffer())
      .then((buf) =>
        Array.from({ length: 5 }, (_, i) =>
          mainStore.prepend(
            new SampleStore({ data: buf, title: `Test Sample #${i}` })
          )
        )
      );
  }
</script>

<Layout><MainScreen /></Layout>
