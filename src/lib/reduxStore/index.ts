import type { Readable, Subscriber } from "svelte/store";
import { getStore } from "./Provider.svelte";

function deriveStore<T, R>(transform: (store: T) => R): Readable<R> {
  return {
    subscribe(fn: Subscriber<R>) {
      const store = getStore();
      let prev = transform(store.getState());
      fn(prev);
      return store.subscribe(() => {
        const newVal = transform(store.getState());
        if (newVal !== prev) {
          prev = newVal;
          fn(newVal);
        }
      });
    },
  };
}

export { default as Provider, getStore } from "./Provider.svelte";
export { deriveStore };
