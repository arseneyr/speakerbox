import inMemory from "$lib/backend/inMemory";
import {
  createTestLocalBackend,
  createTestRemoteBackend,
} from "$lib/backend/testBackend";
import { waitForValue } from "$lib/utils";
import { get } from "svelte/store";
import StateManager from "./StateManager";
import { generateRevisionId, ILocalBackend } from "$lib/types";

let remoteBackendGenerator: ReturnType<typeof createTestRemoteBackend>;
beforeEach(() => {
  remoteBackendGenerator = createTestRemoteBackend();
});

async function waitForSyncing(...managers: StateManager[]) {
  await Promise.all(
    managers.map((manager) => waitForValue(manager.syncing, (s) => !s))
  );
}

async function getLocalState(localBackend: ILocalBackend) {
  const stateManager = new StateManager(
    localBackend,
    remoteBackendGenerator.createEndpoint()
  );
  await stateManager.init();
  return get(stateManager.mainState);
}

async function getRemoteState(user = "") {
  const stateManager = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn(user)
  );
  await stateManager.init();
  await waitForSyncing(stateManager);
  return get(stateManager.mainState);
}

test("local only", async () => {
  const localBackend = createTestLocalBackend();
  const stateManager = new StateManager(
    localBackend,
    remoteBackendGenerator.createEndpoint()
  );
  await stateManager.init();
  expect(get(stateManager.mainState)).toEqual({
    samples: {},
    sampleList: [],
  });
  stateManager.updateMainState((state) => state.sampleList.push("foo"));
  const expectedState = {
    samples: {},
    sampleList: ["foo"],
  };
  expect(get(stateManager.mainState)).toEqual(expectedState);
  await waitForSyncing(stateManager);
  await expect(getLocalState(localBackend)).resolves.toEqual(expectedState);
});

test("upgrade local state on signin", async () => {
  const localBackend = inMemory();
  const remoteBackend = remoteBackendGenerator.createEndpoint();
  const stateManager = new StateManager(localBackend, remoteBackend);
  await stateManager.init();
  stateManager.updateMainState((state) => state.sampleList.push("a"));
  const expectedState = {
    sampleList: ["a"],
    samples: {},
  };
  remoteBackend.__signIn("");
  expect(get(stateManager.syncing)).toBe(true);
  await waitForSyncing(stateManager);
  expect(get(stateManager.mainState)).toEqual(expectedState);
  await expect(getRemoteState()).resolves.toEqual(expectedState);
});

test("simultaneous upgrades", async () => {
  const stateManager1 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  const stateManager2 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  await Promise.all([stateManager1.init(), stateManager2.init()]);

  stateManager1.updateMainState((state) => state.sampleList.push("foo"));
  stateManager2.updateMainState((state) => state.sampleList.push("bar"));
  const expectedState = {
    sampleList: expect.arrayContaining(["foo", "bar"]),
    samples: {},
  };
  await waitForSyncing(stateManager1, stateManager2);
  await Promise.all([stateManager1.poll(), stateManager2.poll()]);
  await waitForSyncing(stateManager1, stateManager2);

  // These will not be identical because one of them wins the race to
  // upload the remote state and then cannot detect the new remote state

  expect(get(stateManager1.mainState)).toEqual(expectedState);
  expect(get(stateManager2.mainState)).toEqual(expectedState);
});

test("simultaneous array edits", async () => {
  const stateManager1 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  await stateManager1.init();
  stateManager1.updateMainState((state) => state.sampleList.push("foo"));
  await waitForSyncing(stateManager1);

  const stateManager2 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  await stateManager2.init();
  await waitForSyncing(stateManager2);
  expect(get(stateManager2.mainState)).toMatchObject({ sampleList: ["foo"] });

  stateManager1.updateMainState((state) => state.sampleList.push("bar"));
  stateManager2.updateMainState((state) => state.sampleList.push("baz"));

  await waitForSyncing(stateManager1, stateManager2);
  await Promise.all([stateManager1.poll(), stateManager2.poll()]);
  await waitForSyncing(stateManager1, stateManager2);
  expect(get(stateManager1.mainState)).toEqual({
    sampleList: expect.arrayContaining(["foo", "bar", "baz"]),
    samples: {},
  });
  expect(get(stateManager2.mainState)).toEqual({
    sampleList: expect.arrayContaining(["foo", "bar", "baz"]),
    samples: {},
  });
});

test("simultaneous sample object edits", async () => {
  const [rev1, rev2, rev3] = Array.from({ length: 3 }, () =>
    generateRevisionId()
  );

  const stateManager1 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  await stateManager1.init();
  stateManager1.updateMainState(
    (state) =>
      (state.samples["sample1Id"] = {
        title: "coolSample",
        revisionId: rev1,
      })
  );
  await waitForSyncing(stateManager1);

  const stateManager2 = new StateManager(
    inMemory(),
    remoteBackendGenerator.createEndpoint().__signIn("")
  );
  await stateManager2.init();
  await waitForSyncing(stateManager2);
  expect(get(stateManager2.mainState)).toMatchObject({
    samples: { sample1Id: { title: "coolSample", revisionId: rev1 } },
  });

  stateManager1.updateMainState(
    (state) => (state.samples.sample1Id.revisionId = rev2)
  );
  stateManager2.updateMainState(
    (state) => (state.samples.sample1Id.revisionId = rev3)
  );
  await waitForSyncing(stateManager1, stateManager2);
  await Promise.all([stateManager1.poll(), stateManager2.poll()]);
  await waitForSyncing(stateManager1, stateManager2);

  expect(get(stateManager1.mainState)?.conflicts).toEqual({
    sample1Id: { revisionId: { localValue: rev2, remoteValues: [rev3] } },
  });
  expect(get(stateManager2.mainState)?.conflicts).toEqual({
    sample1Id: { revisionId: { localValue: rev3, remoteValues: [rev2] } },
  });

  stateManager1.updateMainState(
    (state) => (state.samples.sample1Id.revisionId = rev3)
  );
  const expectedState = {
    sampleList: [],
    samples: { sample1Id: { title: "coolSample", revisionId: rev3 } },
  };
  await waitForSyncing(stateManager1);
  await stateManager2.poll();

  expect(get(stateManager1.mainState)).toEqual(expectedState);
  expect(get(stateManager2.mainState)).toEqual(expectedState);
});

test("updating while offline gets persisted", async () => {
  const localBackend = inMemory();
  let manager = await new StateManager(
    localBackend,
    remoteBackendGenerator.createEndpoint().__signIn("")
  ).init();
  manager.updateMainState((state) => state.sampleList.push("foo"));
  await waitForSyncing(manager);

  const newRemoteBackend = remoteBackendGenerator
    .createEndpoint()
    .__goOffline();
  manager = await new StateManager(localBackend, newRemoteBackend).init();
  expect(get(manager.mainState)).toEqual({ sampleList: ["foo"], samples: {} });

  manager.updateMainState((state) => state.sampleList.push("bar"));
  newRemoteBackend.__signIn("");
  await waitForSyncing(manager);
  await expect(getRemoteState()).resolves.toEqual({
    sampleList: ["foo", "bar"],
    samples: {},
  });
});

test("signing in and out is ok", async () => {
  const remoteBackend = remoteBackendGenerator.createEndpoint();
  await new StateManager(inMemory(), remoteBackend).init();

  expect(() => {
    remoteBackend.__signIn("");
    remoteBackend.__signOut();
  }).not.toThrow();
});

test("signing out while syncing", async () => {
  const remoteBackend = remoteBackendGenerator.createEndpoint().__signIn("");
  const manager = await new StateManager(inMemory(), remoteBackend).init();

  manager.updateMainState((state) => state.sampleList.push("foo"));
  remoteBackend.__signOut();
  await waitForSyncing(manager);
  await expect(getRemoteState()).resolves.toEqual({
    sampleList: [],
    samples: {},
  });
  expect(get(manager.mainState)).toEqual({ sampleList: [], samples: {} });

  remoteBackend.__signIn("");
  await waitForSyncing(manager);
  await expect(getRemoteState()).resolves.toEqual({
    sampleList: ["foo"],
    samples: {},
  });
});
