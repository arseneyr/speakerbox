import * as t from "io-ts";
import { fold, isLeft } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import inMemory from "$lib/backend/inMemory";
import { privateWritable, waitForValue } from "$lib/utils";
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
    // await expect(waitForValue(manager.state)).resolves.toEqual([]);
  });
});
