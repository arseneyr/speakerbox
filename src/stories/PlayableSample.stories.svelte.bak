<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Sample from "../Sample.svelte";
  import { SampleStore } from "$lib/store";
  import wav from "./sample.wav";

  let sampleStore;

  // initialize(inMemory);
  fetch(wav)
    .then((b) => b.arrayBuffer())
    .then(
      (buf) => (sampleStore = new SampleStore({ data: buf, title: "static" }))
    );

  // document.ondragenter = (e) => e.preventDefault();
  // document.ondragover = (e) => e.preventDefault();
  // document.ondrop = (event) => {
  //   event.preventDefault();
  //   console.log(event.dataTransfer.files);
  //   store = SampleStore.createNewSample(event.dataTransfer.files[0], "test");
  // };
</script>

<Meta title="Sample Button" component={Sample} />

<!-- <Template>
  {#if store}
    <Sample id={store.id} />
  {/if}
</Template> -->

<!-- <Story name="Drag n Drop" /> -->

<Story name="Static">
  {#if sampleStore}
    <Sample {sampleStore} />
  {/if}
</Story>
