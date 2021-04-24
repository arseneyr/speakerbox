<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import AddButton from "./AddButton.svelte";
</script>

<Meta
  title="AddButton"
  component={AddButton}
  argTypes={{
    onAdd: { action: "add" },
    onRecord: { action: "record" },
  }}
  parameters={{
    // layout: "fullscreen",
  }}
/>

<Template let:args>
  <div style="min-height: 90vh;">
    <AddButton {...args} on:add={args.onAdd} on:record={args.onRecord} />
  </div>
</Template>

<Story name="Default" />
