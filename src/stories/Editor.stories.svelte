<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Editor from "../components/Editor.svelte";
  import wav from "./long_sample.mp3";
  import faker from "faker";
  import { SampleStore } from "$lib/store";
  const samplePromise = fetch(wav)
    .then((b) => b.blob())
    .then((blob) => SampleStore.createNewSample(blob, faker.lorem.sentence()));
</script>

<Meta title="Editor" component={Editor} />

<Template let:args>
  {#await samplePromise then sample}
    <Editor {...args} id={sample.id} />
  {/await}
</Template>

<Story name="Default" args={{ title: faker.lorem.sentence() }} />
