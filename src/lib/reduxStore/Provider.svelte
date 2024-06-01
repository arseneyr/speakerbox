<script context="module" lang="ts">
  import { getContext, setContext } from "svelte";
  import type { Store } from "@reduxjs/toolkit";

  const key = Symbol();
  export function getStore<T extends Store>(): T {
    return getContext(key);
  }
</script>

<script lang="ts">
  export let store: Store;

  if (import.meta.env.DEV && !store) {
    throw new Error("store not specified for Provider");
  }

  setContext(key, store);
</script>

<slot />
