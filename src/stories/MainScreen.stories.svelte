<script lang="ts">
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "$lib/MainScreen.svelte";
  import faker from "faker";
  import wav from "./sample.wav";
  import SampleStore, { initialize, mainStore } from "$lib/store";
  import inMemory from "$lib/store/inMemory";

  const mainStorePromise = initialize(inMemory);
  const fetchPromise = fetch(wav).then((b) => b.arrayBuffer());
  async function loadMainStore(titles) {
    const [buf] = await Promise.all([fetchPromise, mainStorePromise]);
    $mainStore.samples = titles.map(
      (title) => SampleStore.createNewSample(buf, title).id
    );
  }
</script>

<Meta title="MainScreen" component={MainScreen} />

<Template let:args>
  {#await loadMainStore(args.items) then _}
    <MainScreen {mainStore} />
  {/await}
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 20 }, () => faker.lorem.sentence()),
  }}
/>
