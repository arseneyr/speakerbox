import { Writable, writable } from "svelte/store";

export function persistantWritable<T>(
  init: T,
  persist: (val: T) => Promise<unknown>
): Writable<T> & { saved: Promise<void> } {
  const store = writable(init) as Writable<T> & { saved: Promise<void> };
  store.subscribe((v) => (store.saved = persist(v).then(() => {})));
  return store;
}
