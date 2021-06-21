<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import { action } from "@storybook/addon-actions";
  import AddButton from "../components/AddButton.svelte";
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
    <AddButton {...args} />
  </div>
</Template>

<Story
  name="Default"
  args={{
    options: [
      { text: "Add Sample", icon: "add", onClick: action("onAdd") },
      { text: "Record Desktop", icon: "mic", onClick: action("onRecord") },
    ],
  }}
/>
<Story
  name="Single option"
  args={{
    options: [{ text: "Add Sample", icon: "add", onClick: action("onAdd") }],
  }}
/>
