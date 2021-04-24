<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import MainScreen from "./MainScreen.svelte";
  import Sample from "./Sample.svelte";
  import faker from "faker";
  import wav from "../../static/sample.wav";
  import { createNewSample, getSample, initialize } from "./store";
  import inMemory from "./store/inMemory";

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
