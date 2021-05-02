<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "$lib/MainScreen.svelte";
  import Sample from "$lib/Sample.svelte";
  import faker from "faker";
  import wav from "../../../static/sample.wav";
  import { createNewSample, initialize } from "$lib/store";
  import inMemory from "$lib/store/inMemory";

  initialize(inMemory);
</script>

<Meta title="MainScreen" component={MainScreen} />

<Template let:args>
  <MainScreen>
    <svelte:fragment slot="samples">
      {#await fetch(wav).then((b) => b.arrayBuffer()) then buf}
        {#each args.items as title}
          <Sample id={createNewSample(buf, title).id} />
        {/each}
      {/await}
    </svelte:fragment>
  </MainScreen>
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 20 }, () => faker.lorem.sentence()),
  }}
/>
