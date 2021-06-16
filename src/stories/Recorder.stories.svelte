<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import { action } from "@storybook/addon-actions";
  import AddButton from "$lib/components/AddButton.svelte";
  import { AudioRecorder } from "$lib/recorder/recorder";

  let recorder;
  let stream;

  function onEnd() {
    recorder?.stopRecording();
    stream?.getTracks().forEach((t) => t.stop());
  }

  async function onRecord() {
    recorder = new AudioRecorder();
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
    });
  }
</script>

<Meta
  title="Recorder"
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
    <AddButton
      options={[
        { icon: "mic", text: "Record Desktop", onClick: () => alert("huh") },
      ]}
    />
  </div>
</Template>

<Story name="Default" />
