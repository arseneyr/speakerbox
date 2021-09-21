import * as t from "io-ts";
import { fold, isLeft } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import inMemory from "./backend/inMemory";
import { privateWritable, waitForValue } from "./utils";
import type SyncManager from "./SyncManager";

function createRemoteBackend() {
  const signedInUser = privateWritable<string | false | null>(false);
  return {
    ...inMemory(),
    signedInUser,
    signIn: () => Promise.resolve(),
    __signIn(user: string) {
      signedInUser._set(user);
    },
    __signOut() {
      signedInUser._set(false);
    },
  };
}

describe("AutomergeCodec", () => {
  let Automerge: typeof import("automerge");
  let MergableTestCodec: any;
  const TestCodec = t.type({
    hello: t.literal("foo"),
  });

  beforeAll(async () => {
    const { loadAutomerge, AutomergeCodec } = await import("./SyncManager");
    loadAutomerge();
    MergableTestCodec = AutomergeCodec(TestCodec);
    Automerge = (await import("automerge")).default;
    jest.resetModules();
  });

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

describe("SyncManager", () => {
  let remoteBackend: ReturnType<typeof createRemoteBackend>;
  let SyncManager: typeof import("./SyncManager").default;
  let Automerge: typeof import("automerge");
  beforeAll(async () => {
    SyncManager = (await import("./SyncManager")).default;
    Automerge = (await import("automerge")).default;
    jest.resetModules();
  });
  beforeEach(() => (remoteBackend = createRemoteBackend()));

  test("local only", async () => {
    const localBackend = inMemory();
    const manager = new SyncManager(localBackend, remoteBackend);
    await expect(waitForValue(manager.state)).resolves.toEqual([]);
  });
});
