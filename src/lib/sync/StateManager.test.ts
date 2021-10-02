import inMemory from "$lib/backend/inMemory";
import { createTestRemoteBackend } from "$lib/backend/testBackend";
import { waitForValue } from "$lib/utils";
import { get } from "svelte/store";
import StateManager from "./StateManager";

let remoteBackendGenerator: ReturnType<typeof createTestRemoteBackend>;
beforeEach(() => (remoteBackendGenerator = createTestRemoteBackend()));

async function getRemoteState(user = "") {
  const remoteBackend = remoteBackendGenerator.createEndpoint();
  remoteBackend.__signIn(user);
  const stateManager = new StateManager(inMemory(), remoteBackend);
  await stateManager.init();
  await waitForValue(stateManager.syncing, (syncing) => !syncing);
  return get(stateManager.mainState);
}

test("local only", async () => {
  const localBackend = inMemory();
  const stateManager = new StateManager(
    localBackend,
    remoteBackendGenerator.createEndpoint()
  );
  await stateManager.init();
  expect(get(stateManager.mainState)).toEqual({
    samples: {},
    sampleList: [],
    version: expect.any(String),
  });
  await stateManager.updateMainState((state) => state.sampleList.push("foo"))
    .localSynced;
  expect(get(stateManager.mainState)).toEqual({
    samples: {},
    sampleList: ["foo"],
    version: expect.any(String),
  });
  const newStateManager = new StateManager(
    localBackend,
    remoteBackendGenerator.createEndpoint()
  );
  await newStateManager.init();
  expect(get(newStateManager.mainState)).toEqual({
    samples: {},
    sampleList: ["foo"],
    version: expect.any(String),
  });
});

test("upgrade local state on signin", async () => {
  const localBackend = inMemory();
  const remoteBackend = remoteBackendGenerator.createEndpoint();
  const stateManager = new StateManager(localBackend, remoteBackend);
  await stateManager.init();
  await stateManager.updateMainState((state) => state.sampleList.push("foo"))
    .localSynced;
  const expectedState = {
    sampleList: ["foo"],
    samples: {},
    version: expect.any(String),
  };
  remoteBackend.__signIn("");
  expect(get(stateManager.syncing)).toBe(true);
  await waitForValue(stateManager.syncing, (syncing) => !syncing);
  expect(get(stateManager.mainState)).toEqual(expectedState);
  await expect(getRemoteState()).resolves.toEqual(expectedState);
});
