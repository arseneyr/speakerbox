<script>
  import MainScreen from "./MainScreen.svelte";
  import { initialize } from "$lib/store";
  import localForage from "$lib/store/localForage";
  import Layout from "./Layout.svelte";

  navigator.storage.persist().then((done) => !done && alert("Not persistent!"));
  initialize(localForage);
</script>

<Layout><MainScreen /></Layout>
