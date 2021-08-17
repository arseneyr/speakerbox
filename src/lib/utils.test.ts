import { derived, Readable, writable } from "svelte/store";

test("high order stores", () => {
  const setStore = writable(new Set<Readable<{ inner: Readable<boolean> }>>());

  const flattenedStore = derived(setStore, (set, s1) =>
    derived(Array.from(set), (arr, s2) =>
      derived(
        arr.map((i) => i.inner),
        (innerArray) => innerArray.some((v) => v)
      ).subscribe(s2)
    ).subscribe(s1)
  );

  const subscriber = jest.fn();
  flattenedStore.subscribe(subscriber);
  expect(subscriber).toHaveBeenLastCalledWith(false);
  const inner = writable(true);
  const newSetMember = writable({ inner });
  setStore.update((set) => set.add(newSetMember));
  expect(subscriber).toHaveBeenLastCalledWith(true);
  inner.set(false);
  expect(subscriber).toHaveBeenLastCalledWith(false);
  expect(subscriber).toHaveBeenCalledTimes(3);
});
