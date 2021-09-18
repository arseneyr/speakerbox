import { derived, readable, Readable, writable } from "svelte/store";
import { memoizedDerived } from "./utils";

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

describe("memoizedDerived", () => {
  test("single store", () => {
    const source = writable(1);
    const derivedFn = jest.fn((a) => a + 1);
    const subscriber = jest.fn();

    const derivedStore = memoizedDerived(source, derivedFn);
    expect(derivedFn).not.toHaveBeenCalled();

    const unsub = derivedStore.subscribe(subscriber);
    expect(derivedFn).toHaveBeenCalledTimes(1);
    expect(derivedFn).toHaveBeenCalledWith(1, expect.anything());
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(2);
    unsub();
    derivedStore.subscribe(subscriber);
    expect(derivedFn).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith(2);
    source.set(10);
    expect(derivedFn).toHaveBeenCalledTimes(2);
    expect(derivedFn).toHaveBeenLastCalledWith(10, expect.anything());
    expect(subscriber).toHaveBeenCalledTimes(3);
    expect(subscriber).toHaveBeenLastCalledWith(11);
  });
  test("multiple stores", () => {
    const source1 = writable(1);
    const source2 = readable(2);
    const derivedFn = jest.fn(([a, b]) => a + b);
    const subscriber = jest.fn();

    const derivedStore = memoizedDerived([source1, source2], derivedFn);
    expect(derivedFn).not.toHaveBeenCalled();

    const unsub = derivedStore.subscribe(subscriber);
    expect(derivedFn).toHaveBeenCalledTimes(1);
    expect(derivedFn).toHaveBeenCalledWith(
      expect.arrayContaining([1, 2]),
      expect.anything()
    );
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(3);
    unsub();
    derivedStore.subscribe(subscriber);
    expect(derivedFn).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith(3);
    source1.set(10);
    expect(derivedFn).toHaveBeenCalledTimes(2);
    expect(derivedFn).toHaveBeenLastCalledWith(
      expect.arrayContaining([10, 2]),
      expect.anything()
    );
    expect(subscriber).toHaveBeenCalledTimes(3);
    expect(subscriber).toHaveBeenLastCalledWith(12);
  });
});

// describe("spyOnStore", () => {
//   test("spy on readable", () => {
//     const subscriber = jest.fn();
//     let setter;
//     const store = spyOnStore(
//       null,
//       readable("contents", (set) => {
//         setter = set;
//       })
//     );
//     expect(store._val).toBeNull();

//     store.subscribe(subscriber);
//     expect(subscriber).toHaveBeenCalledWith("contents");
//     expect(store._val).toBe("contents");

//     setter("new contents");
//     expect(store._val).toBe("new contents");
//   });
//   test("spied readable cannot be written to", () => {
//     const store = spyOnStore(null, readable(null));

//     expect(store["set"]).toBeUndefined();
//     expect(store["update"]).toBeUndefined();
//   });

//   test("spy on writable", () => {
//     const subscriber = jest.fn();
//     const store = spyOnStore(null, writable("contents"));
//     expect(store._val).toBeNull();

//     store.set("set contents");
//     expect(store._val).toBe("set contents");
//     store.update(() => "update contents");
//     expect(store._val).toBe("update contents");

//     store.subscribe(subscriber);
//     expect(subscriber).toHaveBeenCalledWith("update contents");
//   });
// });
