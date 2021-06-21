<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Sample from "../Sample.svelte";
  import InMemory from "$lib/store/inMemory";
  import { SampleStore, initialize } from "$lib/store/store";
  import wav from "./sample.wav";

  let store;
  let staticStore;

  initialize(InMemory);
  fetch(wav)
    .then((b) => b.arrayBuffer())
    .then((buf) => (staticStore = SampleStore.createNewSample(buf, "static")));

  document.ondragenter = (e) => e.preventDefault();
  document.ondragover = (e) => e.preventDefault();
  document.ondrop = (event) => {
    event.preventDefault();
    console.log(event.dataTransfer.files);
    store = SampleStore.createNewSample(event.dataTransfer.files[0], "test");
  };
</script>

<Meta title="Sample Button" component={Sample} />

<Template>
  {#if store}
    <Sample id={store.id} />
  {/if}
</Template>

<Story name="Drag n Drop" />

<Story name="Static">
  {#if staticStore}
    <Sample id={staticStore.id} />
  {/if}
</Story>
