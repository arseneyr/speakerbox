import { readable, writable } from "svelte/store";
import { createAnyPlayingStore } from "./mainStore";

describe("createAnyPlayingStore", () => {
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
    expect(subscriber).toHaveBeenLastCalledWith(false);
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
