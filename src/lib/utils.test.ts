import { derived, readable, Readable, writable } from "svelte/store";
import { createAnyPlayingStore } from "./utils";

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

describe("deriveAnyPlaying", () => {
  let setStore: ReturnType<typeof createAnyPlayingStore>;

  beforeEach(() => {
    setStore = createAnyPlayingStore();
  });

  test("empty set", () => {
    const subscriber = jest.fn();
    setStore.subscribe(subscriber);
    expect(subscriber).toHaveBeenLastCalledWith(false);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  test("adding false player", () => {
    const subscriber = jest.fn();
    setStore.subscribe(subscriber);
    setStore.add(readable({ playing: readable(false) }));
    expect(subscriber).toHaveBeenLastCalledWith(false);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
  test("adding true player", () => {
    const subscriber = jest.fn();
    setStore.subscribe(subscriber);
    setStore.add(readable({ playing: readable(true) }));
    expect(subscriber).toHaveBeenLastCalledWith(true);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
  test("adding null player", () => {
    const subscriber = jest.fn();
    setStore.subscribe(subscriber);
    expect(subscriber).toHaveBeenLastCalledWith(false);
    const fullPlayer = writable({ playing: readable(true) });
    setStore.add(fullPlayer);
    setStore.add(readable(null));
    expect(subscriber).toHaveBeenLastCalledWith(true);
    expect(subscriber).toHaveBeenCalledTimes(2);
    fullPlayer.set(null);
    expect(subscriber).toHaveBeenLastCalledWith(false);
  });
  test("unsubbing", () => {
    const subscriber = jest.fn();
    const onUnsub = jest.fn();
    const onSub = jest.fn(() => onUnsub);
    setStore.add(readable({ playing: readable(true, onSub) }));
    expect(onSub).not.toHaveBeenCalled();
    const unsub = setStore.subscribe(subscriber);
    expect(subscriber).toHaveBeenLastCalledWith(true);
    expect(onSub).toBeCalledTimes(1);
    expect(onUnsub).not.toHaveBeenCalled();
    unsub();
    expect(onUnsub).toHaveBeenCalledTimes(1);
  });
});
