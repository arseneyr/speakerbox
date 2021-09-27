import * as t from "io-ts";
import { fold, isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  loadAutomerge,
  AutomergeCodec,
  mergeableInit,
  mergeableMerge,
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
    const doc1 = mergeableInit({ foo: "baz" });
    const doc2 = mergeableInit({ foo: "bar" });
    const merged = mergeableMerge(doc1, doc2);
    expect(merged._conflicts).toBeDefined();
  });
});
