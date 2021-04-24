<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import Sample from "./Sample.svelte";
  import InMemory from "./store/inMemory";
  import { initialize, createNewSample } from "./store";
  import wav from "../../static/sample.wav";

  let store;
  let staticStore;
  fetch(wav)
    .then((b) => b.arrayBuffer())
    .then((buf) => (staticStore = createNewSample(buf, "static")));

  initialize(InMemory);
  document.ondragenter = (e) => e.preventDefault();
  document.ondragover = (e) => e.preventDefault();
  document.ondrop = (event) => {
    event.preventDefault();
    console.log(event.dataTransfer.files);
    store = createNewSample(event.dataTransfer.files[0], "test");
  };
</script>

<Meta title="Sample Button" component={Sample} />

<Template>
  {#if store}
    <Sample id={store.id} />
  {/if}
</Template>

<Story name="Yes" />

<Story name="Static">
  {#if staticStore}
    <Sample id={staticStore.id} />
  {/if}
</Story>
