<script>
  import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
  import SampleButtonWrapper from "./SampleButtonWrapper.svelte";
</script>

<Meta title="Sample Button" component={SampleButtonWrapper} />

<!-- <Template>
  {#if store}
    <Sample id={store.id} />
  {/if}
</Template> -->

<!-- <Story name="Drag n Drop" /> -->

<Story name="Static">
  <SampleButtonWrapper />
</Story>
