import * as t from "io-ts";
import { fold, isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  loadAutomerge,
  AutomergeCodec,
  mergeableInit,
  mergeableMerge,
  mergeableChange,
  mergeableClone,
} from "./automerge";

let Automerge: typeof import("automerge");
let MergableTestCodec: ReturnType<typeof AutomergeCodec>;
const TestCodec = t.type({
  hello: t.literal("foo"),
});

beforeAll(async () => {
  Automerge = await loadAutomerge();
  MergableTestCodec = AutomergeCodec(TestCodec);
});

describe("AutomergeCodec", () => {
  test("encodes/decodes properly", () => {
    const doc = Automerge.from({ hello: "foo" });
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
    expect(isLeft(MergableTestCodec.decode(new Uint8Array()))).toBe(true);
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
    const merged = mergeableMerge(doc1, doc2);
    expect(merged._conflicts).toEqual(
      // expect.arrayContaining([
      //   {
      //     path: ["foo"],
      //     values: expect.arrayContaining([
      //       { setByNewDoc: true, value: "baz" },
      //       { setByNewDoc: false, value: "bar" },
      //     ]),
      //   },
      // ])
      {
        foo: expect.arrayContaining([
          { actorId: "c0ffee", value: "baz" },
          { actorId: "f00d", value: "bar" },
        ]),
      }
    );
    // expect(merged._conflicts).toHaveLength(1);
  });

  test("array changes", () => {
    let doc1 = mergeableInit({ foo: ["bar"] });
    const doc2 = mergeableClone(doc1);
    expect(Automerge.getActorId(doc1)).not.toBe(Automerge.getActorId(doc2));

    doc1 = mergeableChange(doc1, ({ foo }) => {
      foo.push("baz");
    });
    const merged = mergeableMerge(doc2, doc1);
    expect(merged._conflicts).not.toBeDefined();
    expect(merged).toEqual({ foo: expect.arrayContaining(["bar", "baz"]) });
  });

  test("nested object changes", () => {
    let doc1 = mergeableInit({ foo: {} });
    let doc2 = mergeableInit({ foo: {} });
    doc1 = mergeableChange(doc1, ({ foo }: any) => (foo.bar = "bob"));
    doc2 = mergeableChange(doc2, ({ foo }: any) => (foo.baz = "pop"));
    const merged = mergeableMerge(doc2, doc1);
    expect(merged._conflicts).toEqual({
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
    expect(merged._conflicts).not.toBeDefined();
  });
  test("reordering arrays while adding", () => {
    let doc1 = mergeableInit({ foo: [1, 2, 3] });
    let doc2 = mergeableClone(doc1);
    doc2 = mergeableChange(doc2, (state) => {
      // Moving entries works though
      state.foo.push(state.foo.splice(0, 1)[0]);
    });
    doc1 = mergeableChange(doc1, (state) => {
      state.foo.push(4);
    });
    const merged = mergeableMerge(doc2, doc1);

    expect(merged._conflicts).not.toBeDefined();
    expect(merged).toEqual({ foo: expect.arrayContaining([1, 2, 3, 4]) });
  });
});
