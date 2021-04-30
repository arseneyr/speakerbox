<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import ControlPanel from "./ControlPanel.svelte";
  import Grid from "./Grid.svelte";
</script>

<Meta title="Control Panel" component={ControlPanel} />

<Template let:args>
  <Grid>
    <ControlPanel slot="panel" {...args} />
  </Grid>
</Template>

<Story
  name="One Option"
  args={{ addOptions: [{ text: "Add Sample", icon: "add" }] }}
/>

<Story
  name="Multiple Options"
  args={{
    addOptions: [
      { text: "Add Sample", icon: "add" },
      { text: "Record Desktop", icon: "mic" },
    ],
  }}
/>
