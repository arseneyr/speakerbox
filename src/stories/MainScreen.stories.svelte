<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "$lib/MainScreen.svelte";
  import faker from "faker";
  import wav from "./sample.wav";
  import SampleStore, { initialize } from "$lib/store/store";
  import inMemory from "$lib/store/inMemory";

  const mainStorePromise = initialize(inMemory);
</script>

<Meta title="MainScreen" component={MainScreen} />

<Template let:args>
  {#await mainStorePromise then mainStore}
    {#await fetch(wav)
      .then((b) => b.arrayBuffer())
      .then((buf) => mainStore.update((ms) => {
          ms.samples = args.items.map((title) => SampleStore.createNewSample(buf, title).id);
          return ms;
        })) then _}
      <MainScreen {mainStore} />
    {/await}
  {/await}
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 20 }, () => faker.lorem.sentence()),
  }}
/>
