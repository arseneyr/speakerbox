<script lang="ts">
  import { gDrive, localForage } from "$lib/backend";
  import App from "./App.svelte";

  import Layout from "./Layout.svelte";

  function onScriptLoad() {
    window.onGapiLoad?.();
  }
</script>

<svelte:head>
  <script
    async
    defer
    src="https://apis.google.com/js/api.js"
    on:load={onScriptLoad}
    onreadystatechange="if (this.readyState === 'complete') this.onload()">
  </script>
</svelte:head>

<!-- <Layout>
  {#await gDrive() then backend}<App {backend} />{/await}</Layout
> -->
<Layout><App backend={localForage()} /></Layout>
