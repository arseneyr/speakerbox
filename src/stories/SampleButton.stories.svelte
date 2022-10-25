<script lang="ts">
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import SampleButton from "../components/SampleButton.svelte";
  // import SampleButtonWrapper from "./SampleButtonWrapper.svelte";
  import wav from "./assets/sample.wav";
  import WaveformData from "waveform-data";

  let startTime = null;
  let waveform: WaveformData | null = null;
  fetch(wav)
    .then((b) => b.arrayBuffer())
    .then((buffer) =>
      WaveformData.createFromAudio(
        {
          audio_context: new AudioContext(),
          array_buffer: buffer,
        },
        (_, w) => {
          waveform = w;
        }
      )
    );
</script>

<Meta
  title="Sample Button"
  component={SampleButton}
  argTypes={{
    onClick: { action: "onClick" },
    onIconClick: { action: "onIconClick" },
    iconButton: { control: { type: "text" } },
    enableIconButton: { control: { type: "boolean" } },
  }}
/>

<Template let:args>
  <SampleButton
    {...args}
    {waveform}
    {startTime}
    durationMs={3000}
    on:click={() => {
      startTime = Date.now();
      args.onClick();
    }}
    iconButton={true
      ? { icon: args.iconButton, onClick: args.onIconClick }
      : undefined}
  />
</Template>

<Story name="Normal" args={{ title: "yo" }} />
<Story
  name="Very long title"
  args={{ title: "yo ok this title is hellla long ok vffaserlfkwerk;fa" }}
/>
<Story name="With Icon Button" args={{ title: "yoooo", iconButton: "edit" }} />
<Story name="Reactive">
  <!-- <SampleButtonWrapper title="YOOOO" duration={3000} /> -->
</Story>

<Story name="Loading" args={{ title: "still loading", loading: true }} />
<Story name="Edit Mode" args={{ title: "Hello edit me", editMode: true }} />
