import * as t from "io-ts";
import { isLeft } from "fp-ts/lib/Either";
import {
  loadAutomerge,
  mergeableInit,
  mergeableMerge,
  mergeableChange,
  mergeableClone,
  mergeableLoad,
  mergeableSave,
  mergeableGetConflicts,
  mergeableDuplicate,
} from "./automerge";
import { AutomergeCodec } from "$lib/types";

let Automerge: typeof import("automerge");
const TestCodec = t.type({
  hello: t.literal("foo"),
});
const MergableTestCodec = AutomergeCodec(TestCodec);

beforeAll(async () => {
  Automerge = await loadAutomerge();
  // MergableTestCodec = AutomergeCodec(TestCodec);
});

describe("AutomergeCodec", () => {
  // test("encodes/decodes properly", () => {
  //   const doc = mergeableInit({ hello: "foo" as const });
  //   const encoded = MergableTestCodec.encode(doc);
  //   expect(encoded).toBeInstanceOf(Uint8Array);
  //   // expect(isRight(either));
  //   pipe(
  //     MergableTestCodec.decode(encoded),
  //     fold(
  //       () => {
  //         throw new Error();
  //       },
  //       (decodedDoc) => {
  //         expect(decodedDoc).toStrictEqual(doc);
  //       }
  //     )
  //   );
  // });

  test("invalid input causes error", () => {
    expect(isLeft(MergableTestCodec.decode(new Uint8Array(10)))).toBe(true);
  });
  test("invalid schema causes error", () => {
    const encoded = MergableTestCodec.encode(
      Automerge.from({ hello: "bar" }) as any
    );
    expect(isLeft(MergableTestCodec.decode(encoded))).toBe(true);
  });
});

describe("automerge conflicts", () => {
  test("double init", () => {
    const doc1 = mergeableInit<{ foo: string; big?: string }>({ foo: "baz" });
    const doc2 = mergeableInit<{ foo: string; big?: string }>({ foo: "bar" });
    const expectedConflict = {
      foo: expect.arrayContaining([
        { actorId: expect.any(String), value: "baz" },
        { actorId: expect.any(String), value: "bar" },
      ]),
    };
    const merged = mergeableMerge(doc1, doc2);
    expect(mergeableGetConflicts(merged)).toEqual(expectedConflict);
    const merged2 = mergeableMerge(doc2, merged);
    expect(mergeableGetConflicts(merged2)).toEqual(expectedConflict);

    // Changing unrelated key keeps conflict
    mergeableChange(merged2, (doc) => (doc["big"] = "dep"));
    expect(mergeableGetConflicts(merged2)).toEqual(expectedConflict);
  });

  test("array changes", () => {
    let doc1 = mergeableInit({ foo: ["bar"] });
    const doc2 = mergeableClone(doc1);
    expect(Automerge.getActorId(doc1)).not.toBe(Automerge.getActorId(doc2));

    doc1 = mergeableChange(doc1, ({ foo }) => {
      foo.push("baz");
    });
    const merged = mergeableMerge(doc2, doc1);
    expect(mergeableGetConflicts(merged)).toBeNull();
    expect(merged).toEqual({ foo: expect.arrayContaining(["bar", "baz"]) });
  });

  test("nested object changes", () => {
    let doc1 = mergeableInit({ foo: {} });
    let doc2 = mergeableInit({ foo: {} });
    doc1 = mergeableChange(doc1, ({ foo }) => ((foo as any).bar = "bob"));
    doc2 = mergeableChange(doc2, ({ foo }) => ((foo as any).baz = "pop"));
    const merged = mergeableMerge(doc2, doc1);
    expect(mergeableGetConflicts(merged)).toEqual({
      foo: expect.arrayContaining([
        { actorId: expect.any(String), value: { bar: "bob" } },
        { actorId: expect.any(String), value: { baz: "pop" } },
      ]),
    });
  });

  test("reordering arrays via replacement while adding", () => {
    let doc1 = mergeableInit({ foo: [1, 2, 3] });
    let doc2 = mergeableClone(doc1);
    doc2 = mergeableChange(doc2, (state) => {
      state.foo = [3, 1, 2];
      // This creates an entirely new list
    });
    doc1 = mergeableChange(doc1, (state) => {
      state.foo.push(4);
      // This is operating on the old list, so this update is lost
    });
    const merged = mergeableMerge(doc2, doc1);

    // There is no conflict, because the doc2 update is creating a new list and
    // changing doc.foo, while doc1 update is operating on the old list
    expect(mergeableGetConflicts(merged)).toBeNull();
  });

  test("reordering arrays while adding", () => {
    let doc1 = mergeableInit({ foo: [1, 2, 3] });
    let doc2 = mergeableClone(doc1);
    doc2 = mergeableChange(doc2, (state) => {
      // Moving entries works though
      state.foo.push(state.foo.splice(0, 1)[0]);
    });
    doc1 = mergeableChange(doc1, (state) => {
      state.foo.push(state.foo.splice(1, 1)[0]);
      state.foo.push(4);
    });
    const merged = mergeableMerge(doc2, doc1);

    expect(mergeableGetConflicts(merged)).toBeNull();
    expect(merged).toEqual({ foo: expect.arrayContaining([1, 2, 3, 4]) });
  });

  test("save/load with conflicts", () => {
    let doc1 = mergeableInit({ foo: "a" });
    let doc2 = mergeableClone(doc1);
    const doc1ActorId = Automerge.getActorId(doc1);
    const doc2ActorId = Automerge.getActorId(doc2);
    expect(doc1ActorId).not.toBe(doc2ActorId);
    doc1 = mergeableChange(doc1, (state) => (state.foo = "b"));
    doc2 = mergeableChange(doc2, (state) => (state.foo = "c"));
    const expectedConflict = {
      foo: expect.arrayContaining([
        { actorId: doc1ActorId, value: "b" },
        { actorId: doc2ActorId, value: "c" },
      ]),
    };
    // Actor ids didn't change
    expect(doc1ActorId).toBe(Automerge.getActorId(doc1));

    const merged = mergeableMerge(doc1, doc2);
    expect(Automerge.getActorId(merged)).toBe(doc1ActorId);
    expect(mergeableGetConflicts(merged)).toEqual(expectedConflict);

    const savedMerged = mergeableSave(merged);
    const loadedMerged = mergeableLoad(savedMerged);
    // Actor ID changes on load
    expect(Automerge.getActorId(loadedMerged)).not.toBe(
      Automerge.getActorId(merged)
    );
    expect(mergeableGetConflicts(loadedMerged)).toEqual(expectedConflict);
  });

  test("empty object merge with non-empty object", () => {
    const doc1 = mergeableInit({});
    const doc2 = mergeableInit({ foo: "bar" });
    const merged1 = mergeableMerge(doc1, doc2);
    const merged2 = mergeableMerge<any>(doc2, merged1);
    expect(mergeableGetConflicts(merged1)).toBeNull();
    expect(mergeableGetConflicts(merged2)).toBeNull();
    expect(merged1).toStrictEqual(merged2);
  });

  test("empty merges doesn't change object reference", () => {
    const doc = mergeableInit({ foo: "bar" });
    const remote = mergeableClone(doc);

    const doc2 = mergeableMerge(doc, remote);
    expect(doc2).toBe(doc);
  });

  test("duplicate", () => {
    const doc1 = mergeableInit({ foo: "bar" });
    const doc2 = mergeableDuplicate(doc1);
    expect(doc2).toStrictEqual(doc1);
    expect(doc1).not.toBe(doc2);
  });
});
