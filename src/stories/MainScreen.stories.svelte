<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "../MainScreen.svelte";
  import faker from "@faker-js/faker";
  import wav from "./sample.wav";
  import { SampleStore, MainStore, setMainStore } from "$lib/store";
  import { inMemory } from "$lib/backend";
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";

  const mainStore = new MainStore(inMemory());
  setMainStore(mainStore);
  const fetchPromise = fetch(wav).then((b) => b.arrayBuffer());
  async function loadMainStore(titles) {
    const [buf] = await Promise.all([fetchPromise, mainStore.init()]);
    titles.forEach((title) =>
      mainStore.append(new SampleStore({ data: buf, title }))
    );
  }
  onDestroy(() => {
    get(mainStore.samples)?.forEach(({ id }) => mainStore.remove(id).delete());
  });
</script>

<Meta title="MainScreen" component={MainScreen} />

<Template let:args>
  {#await loadMainStore(args.items) then _}
    <MainScreen />
  {/await}
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 290 }, () => faker.lorem.sentence()),
  }}
/>
