<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Editor from "../components/Editor.svelte";
  import wav from "./long_sample.mp3";
  import faker from "@faker-js/faker";
  import { SampleStore } from "$lib/store";
  const samplePromise = fetch(wav)
    .then((b) => b.blob())
    .then(
      (blob) => new SampleStore({ data: blob, title: faker.lorem.sentence() })
    );
</script>

<Meta title="Editor" component={Editor} />

<Template let:args>
  {#await samplePromise then sample}
    <Editor {...args} sampleStore={sample} />
  {/await}
</Template>

<Story name="Default" args={{ title: faker.lorem.sentence() }} />
