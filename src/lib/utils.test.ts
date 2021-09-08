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
