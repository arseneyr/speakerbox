import { defer, firstValueFrom, Observable } from "rxjs";
import { TestScheduler } from "rxjs/testing";
import {
  derived,
  get,
  readable,
  Readable,
  Writable,
  writable,
} from "svelte/store";
import type { Player } from "./types";
import { createAnyPlayingStore, ObservableQueue } from "./utils";

let testScheduler: TestScheduler;

beforeEach(() => {
  testScheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
});

test("serial subscriptions", () => {
  testScheduler.run((helpers) => {
    const { cold, expectSubscriptions, expectObservable } = helpers;
    const queue = new ObservableQueue();

    const o1 = cold("-a---|");
    const e1 = "     -a---|";
    const o1subs = " ^----!----";
    const o2 = cold("     -b--|");
    const e2 = "     ------b--|";
    const o2subs = " -----^---!";

    const q1 = queue.add(o1);
    const q2 = queue.add(o2);

    expectObservable(q1).toBe(e1);
    expectObservable(q2).toBe(e2);
    expectSubscriptions(o1.subscriptions).toBe(o1subs);
    expectSubscriptions(o2.subscriptions).toBe(o2subs);
    expect;
  });
});

test("errors don't stop queue", () => {
  testScheduler.run((helpers) => {
    const { cold, expectSubscriptions, expectObservable } = helpers;
    const queue = new ObservableQueue();

    const o1 = cold("-a---#");
    const e1 = "     -a---#";
    const o1subs = " ^----!----";
    const o2 = cold("     -b--|");
    const e2 = "     ------b--|";
    const o2subs = " -----^---!";

    const q1 = queue.add(o1);
    const q2 = queue.add(o2);

    expectObservable(q1).toBe(e1);
    expectObservable(q2).toBe(e2);
    expectSubscriptions(o1.subscriptions).toBe(o1subs);
    expectSubscriptions(o2.subscriptions).toBe(o2subs);
  });
});

test("not subscribing to queued observable right away", () => {
  testScheduler.run((helpers) => {
    const { cold, expectObservable } = helpers;
    const queue = new ObservableQueue();

    const o1 = cold("   -ab--c----|");
    const q1subs = "    -----^-----";
    const q1expected = "-----(abc)|";

    const q1 = queue.add(o1);

    expectObservable(q1, q1subs).toBe(q1expected);
  });
});

test("adding deferred promises to queue", async () => {
  const queue = new ObservableQueue();

  function createObservableFromPromise() {
    const ret: Observable<void> & { started?: true } = defer(() => {
      ret.started = true;
      return Promise.resolve();
    });
    return ret;
  }

  const first = createObservableFromPromise();
  const second = createObservableFromPromise();
  queue.add(first);
  await expect(firstValueFrom(first)).resolves.not.toThrow();
  expect(first.started).toBe(true);
  expect(second.started).toBeFalsy();
});

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
  type SimplePlayer = Pick<Player, "playing">;
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
