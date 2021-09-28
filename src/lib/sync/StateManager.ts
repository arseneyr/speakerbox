import { derived, get, writable } from "svelte/store";
import {
  ILocalBackend,
  IRemoteBackend,
  LocalStateCached,
  LocalState,
  LocalStateFull,
  LOCAL_STATE_KEY,
  LOCAL_VERSION_1_0,
  MainState,
  MAIN_VERSION_1_0,
  MergeableMainState,
  REMOTE_STATE_KEY,
} from "./types";
import {
  loadAutomerge,
  mergeableChange,
  mergeableClone,
  mergeableInit,
  mergeableMerge,
} from "./automerge";
import { assert } from "$lib/utils";
import { pipe } from "fp-ts/lib/function";
import { getOrElseW } from "fp-ts/lib/Either";

type InternalCachedState = LocalStateCached & {
  cachedState: MergeableMainState;
};
type InternalLocalState = LocalStateFull | InternalCachedState;

function upgradeLocalState(
  localState: LocalStateFull,
  remoteState: MergeableMainState | null,
  userId: string
): { localState: InternalCachedState; remoteState: MergeableMainState } {
  let newRemoteState: MergeableMainState, newCachedState: MergeableMainState;
  if (!remoteState) {
    newCachedState = mergeableInit(localState.mainState);
    newRemoteState = mergeableClone(newCachedState);
  } else {
    assert(
      remoteState.sampleList.filter((id) =>
        localState.mainState.sampleList.includes(id)
      ).length === 0,
      "duplicate samples in remote/local sample list!"
    );
    assert(
      Object.keys(remoteState.samples).filter((id) =>
        Object.keys(localState.mainState.samples).includes(id)
      ).length === 0,
      "duplicate samples in remote/local sample map!"
    );

    newRemoteState = mergeableChange(remoteState, (state) => {
      state.sampleList.push(...localState.mainState.sampleList);
      for (const [k, v] of Object.entries(localState.mainState.samples)) {
        state.samples[k] = v;
      }
    });
    newCachedState = mergeableClone(newRemoteState);
  }

  return {
    localState: {
      version: localState.version,
      settings: localState.settings,
      userId,
      cachedState: newCachedState,
    },
    remoteState: newRemoteState,
  };
}

function mergeCachedAndRemoteStates(
  cachedState: MergeableMainState,
  remoteState: MergeableMainState
): { cachedState: MergeableMainState; remoteState: MergeableMainState } {
  const newRemoteState = mergeableMerge(remoteState, cachedState);
}

class StateManager {
  private readonly _localState = writable<InternalLocalState>();
  private readonly _remoteState = writable<MergeableMainState | null>(null);

  public readonly mainState = derived(
    this._localState,
    this._derivedMainStore.bind(this)
  );

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {}

  public async init(): Promise<void> {
    const fetchedLocalState = await this._fetchLocalState();
    let internalLocalState: InternalLocalState;
    if (!fetchedLocalState) {
      internalLocalState = StateManager._createNewLocalState();
      await this._localBackend.setState(LOCAL_STATE_KEY, internalLocalState);
    } else if (LocalStateCached.is(fetchedLocalState)) {
      const cachedState = await this._fetchCachedState(
        fetchedLocalState.userId
      );
      if (!cachedState) {
        internalLocalState = StateManager._createNewLocalState();
        await this._localBackend.setState(LOCAL_STATE_KEY, internalLocalState);
      } else {
        internalLocalState = { ...fetchedLocalState, cachedState };
      }
    } else {
      internalLocalState = fetchedLocalState;
    }

    this._localState.set(internalLocalState);
    this._remoteBackend.signedInUser.subscribe(this._onSignIn.bind(this));
  }

  public updateMainState(
    updateFn: (state: MainState) => void
  ): [Promise<unknown>, Promise<unknown>] {
    let syncRemoteState = false;
    this._localState.update((state) => {
      if (LocalStateFull.is(state)) {
        updateFn(state.mainState);
      } else {
        state.cachedState = mergeableChange(state.cachedState, updateFn);
        this._remoteState.update((remoteState) => {
          if (remoteState) {
            syncRemoteState = true;
            remoteState = mergeableMerge(remoteState, state.cachedState);
          }
          return remoteState;
        });
      }
      return state;
    });
    const localSyncPromise = this._syncLocalState();
    const remoteSyncPromise = syncRemoteState
      ? this._syncRemoteState()
      : Promise.resolve();

    return [
      localSyncPromise,
      Promise.all([localSyncPromise, remoteSyncPromise]),
    ];
  }

  private _derivedMainStore(localState: InternalLocalState | undefined) {
    if (!localState) {
      return null;
    }

    if (LocalStateFull.is(localState)) {
      return localState.mainState;
    } else {
      return localState.cachedState;
    }
  }
  private static _createNewMainState(): MainState {
    return {
      version: MAIN_VERSION_1_0,
      sampleList: [],
      samples: {},
    };
  }

  private static _createNewLocalState(): LocalStateFull {
    return {
      version: LOCAL_VERSION_1_0,
      settings: {},
      mainState: StateManager._createNewMainState(),
    };
  }

  private async _syncLocalState() {
    const localState = get(this._localState);
    if ("cachedState" in localState) {
      await Promise.all([
        this._localBackend.setState(
          localState.userId,
          MergeableMainState.encode(localState.cachedState)
        ),
      ]);
    }
  }

  private async _syncRemoteState() {
    const remoteState = get(this._remoteState);
    remoteState &&
      (await this._remoteBackend.setState(
        REMOTE_STATE_KEY,
        MergeableMainState.encode(remoteState)
      ));
  }

  private async _fetchLocalState() {
    const encodedState = await this._localBackend.getState(LOCAL_STATE_KEY);
    if (!encodedState) {
      return null;
    }
    return pipe(
      LocalState.decode(encodedState),
      getOrElseW((err) => {
        console.log(err);
        return null;
      })
    );
  }

  private async _fetchCachedState(userId: string) {
    const [encodedCache] = await Promise.all([
      this._localBackend.getState(userId),
      loadAutomerge(),
    ]);
    return pipe(
      MergeableMainState.decode(encodedCache),
      getOrElseW((err) => {
        console.log(err);
        this._localBackend.deleteState(userId);
        return null;
      })
    );
  }

  private async _fetchRemoteState() {
    const [encodedRemoteState] = await Promise.all([
      this._remoteBackend.getState(REMOTE_STATE_KEY),
      loadAutomerge(),
    ]);
    if (encodedRemoteState === null) {
      return null;
    }
    return pipe(
      MergeableMainState.decode(encodedRemoteState),
      getOrElseW((err) => {
        console.log(err);
        return null;
      })
    );
  }

  private async _onSignIn(userId: string | false | null) {
    if (userId === null) {
      return;
    }
    let syncLocalState = false,
      syncRemoteState = false;
    if (typeof userId === "string") {
      let remoteState = await this._fetchRemoteState();

      this._localState.update((localState) => {
        if ("cachedState" in localState) {
          if (localState.userId === userId) {
            // Existing cached user signed in
            if (!remoteState) {
              remoteState = mergeableClone(localState.cachedState);
            } else {
              remoteState = mergeableMerge(remoteState, localState.cachedState);
              localState.cachedState = mergeableMerge(
                localState.cachedState,
                remoteState
              );
            }
            syncLocalState = syncRemoteState = true;
          } else {
            // New user signed in. Throw away the cache.
            if (!remoteState) {
              remoteState = mergeableInit(StateManager._createNewMainState());
              syncRemoteState = true;
            }
            localState.cachedState = mergeableClone(remoteState);
            localState.userId = userId;
            syncLocalState = true;
          }
        } else {
          // Upgrade local state to cached state
          ({ localState, remoteState } = upgradeLocalState(
            localState,
            remoteState,
            userId
          ));
          syncLocalState = syncRemoteState = true;
        }
        return localState;
      });
      this._remoteState.set(remoteState);
    } else if (userId === false) {
      // The user has logged out. We change cached state to local state

      this._remoteState.set(null);
      this._localState.update((localState) => {
        if ("userId" in localState) {
          this._localBackend.deleteState(localState.userId);
          localState = StateManager._createNewLocalState();
          syncLocalState = true;
        }
        return localState;
      });
    }
    syncLocalState && this._syncLocalState();
    syncRemoteState && this._syncRemoteState();
  }
}

export default StateManager;
