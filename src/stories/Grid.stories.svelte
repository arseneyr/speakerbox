<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import SampleButton from "../components/SampleButton.svelte";
  import Grid from "../components/Grid.svelte";
  import faker from "faker";
</script>

<Meta title="Grid" component={Grid} />

<Template let:args>
  <Grid>
    {#each args.items as sample}
      <SampleButton
        {...sample}
        iconButton={sample.iconButton ? { icon: sample.iconButton } : undefined}
      />
    {/each}
  </Grid>
</Template>

<Story
  name="Of Sample buttons"
  args={{
    items: Array.from({ length: 20 }, () => ({
      title: faker.lorem.sentence(),
      iconButton: faker.random.boolean() ? "edit" : undefined,
    })),
  }}
/>
