<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import SampleButtonWrapper from "./SampleButtonWrapper.svelte";
  import Grid from "../components/Grid.svelte";
  import { faker } from "@faker-js/faker";
  import sample from "./assets/short.webm";
</script>

<Meta title="Grid" component={Grid} />

<Template let:args>
  <Grid>
    {#each args.items as sample}
      <SampleButtonWrapper {...sample} />
    {/each}
  </Grid>
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 20 }, () => ({
      // sampleUrl: sample,
      title: faker.lorem.sentence(),
    })),
  }}
/>
