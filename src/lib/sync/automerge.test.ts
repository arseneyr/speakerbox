import * as t from "io-ts";
import { fold, isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  loadAutomerge,
  mergeableInit,
  mergeableMerge,
  mergeableChange,
  mergeableClone,
  mergeableLoad,
  mergeableSave,
  mergeableGetConflicts,
} from "./automerge";
import { AutomergeCodec } from "./types";

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
  test("encodes/decodes properly", () => {
    const doc = mergeableInit({ hello: "foo" as const });
    const encoded = MergableTestCodec.encode(doc);
    expect(encoded).toBeInstanceOf(Uint8Array);
    // expect(isRight(either));
    pipe(
      MergableTestCodec.decode(encoded),
      fold(
        () => {
          throw new Error();
        },
        (decodedDoc) => {
          expect(decodedDoc).toEqual(doc);
        }
      )
    );
  });

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
    const doc1 = mergeableInit({ foo: "baz" }, "c0ffee");
    const doc2 = mergeableInit({ foo: "bar" }, "f00d");
    const expectedConflict = {
      foo: expect.arrayContaining([
        { actorId: "c0ffee", value: "baz" },
        { actorId: "f00d", value: "bar" },
      ]),
    };
    const merged = mergeableMerge(doc1, doc2);
    expect(mergeableGetConflicts(merged)).toEqual(expectedConflict);
    const merged2 = mergeableMerge(doc2, merged);
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
    doc1 = mergeableChange(doc1, ({ foo }: any) => (foo.bar = "bob"));
    doc2 = mergeableChange(doc2, ({ foo }: any) => (foo.baz = "pop"));
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
    // Actor ID doesnt change on load
    expect(Automerge.getActorId(loadedMerged)).toBe(
      Automerge.getActorId(merged)
    );
    expect(mergeableGetConflicts(loadedMerged)).toEqual(expectedConflict);
  });
});
