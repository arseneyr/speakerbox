<script lang="ts">
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "../MainScreen.svelte";
  import faker from "faker";
  import wav from "./sample.wav";
  import { SampleStore, MainStore, setMainStore } from "$lib/store";
  import { inMemory } from "$lib/backend";

  const mainStore = new MainStore(inMemory());
  setMainStore(mainStore);
  const fetchPromise = fetch(wav).then((b) => b.arrayBuffer());
  async function loadMainStore(titles) {
    const [buf] = await Promise.all([fetchPromise, mainStore.init()]);
    titles.forEach((title) =>
      mainStore.prepend(new SampleStore({ data: buf, title }))
    );
  }
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
