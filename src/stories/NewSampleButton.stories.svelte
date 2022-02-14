<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import NewSampleButton from "../components/NewSampleButton.svelte";
  import { AudioRecorder } from "$lib/recorder/recorder";
</script>

<Meta
  title="New Sample Button"
  component={NewSampleButton}
  parameters={{
    // layout: "fullscreen",
  }}
/>

<Template let:args>
  <div style="min-height: 90vh;">
    <NewSampleButton />
  </div>
</Template>

<Story name="Default" />
