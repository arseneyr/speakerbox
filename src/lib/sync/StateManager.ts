import { derived, get, Readable, writable } from "svelte/store";
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
  SampleInfo,
  SignedInState,
  SignedInTypes,
} from "./types";
import {
  loadAutomerge,
  mergeableChange,
  mergeableClone,
  mergeableInit,
  mergeableMerge,
} from "./automerge";
import { assert, Entries, privateWritable } from "$lib/utils";
import { pipe } from "fp-ts/lib/function";
import { getOrElseW } from "fp-ts/lib/Either";
import PQueue from "p-queue";

type InternalCachedState = LocalStateCached & {
  cachedState: MergeableMainState;
};
type InternalLocalState = LocalStateFull | InternalCachedState;

type OutputConflicts<T> = {
  [sampleId: string]: {
    [K in keyof T]?: {
      localValue: T[K];
      remoteValue: T[K];
    };
  };
};
type OutputState =
  | (MainState & { conflicts?: OutputConflicts<SampleInfo> })
  | null;

class StateManager {
  private readonly _localState = writable<InternalLocalState>();
  private readonly _remoteState = writable<MergeableMainState | null>(null);
  private readonly _syncQueue = new PQueue();

  public readonly mainState: Readable<OutputState> = derived(
    this._localState,
    this._derivedMainStore.bind(this)
  );

  public readonly syncing = privateWritable(false);

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {
    this._syncQueue.on("add", () => this.syncing._set(true));
    this._syncQueue.on("idle", () => this.syncing._set(false));
  }

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
        internalLocalState = {
          ...fetchedLocalState,
          cachedState,
        };
      }
    } else {
      internalLocalState = fetchedLocalState;
    }

    this._localState.set(internalLocalState);
    this._remoteBackend.signedInUser.subscribe(this._onSignIn.bind(this));
  }

  public updateMainState(
    updateFn: (state: MainState) => void
  ): { localSynced: Promise<unknown>; remoteSynced: Promise<unknown> } {
    this.syncing._set(true);
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
    const localSynced = this._syncLocalState();
    const remoteSynced = Promise.all([
      localSynced,
      syncRemoteState ? this._syncRemoteState() : Promise.resolve(),
    ]);

    return {
      localSynced,
      remoteSynced,
    };
  }

  private _derivedMainStore(localState: InternalLocalState | undefined) {
    if (!localState) {
      return null;
    }

    if (LocalStateFull.is(localState)) {
      return localState.mainState;
    } else {
      const sampleConflicts = localState.cachedState._conflicts?.samples;
      if (sampleConflicts) {
        const remoteState = get(this._remoteState);
        assert(remoteState);

        const ret = {
          ...localState.cachedState,
          conflicts: {} as OutputConflicts<SampleInfo>,
        };
        for (const [sampleId, sampleConflict] of Object.entries(
          sampleConflicts
        )) {
          for (const [conflictingProp, conflict] of Object.entries(
            sampleConflict
          ) as Entries<typeof sampleConflict>) {
            const localValue = conflict.find(
              ({ actorId }) => actorId === localState.cachedState._actorId
            )?.value;
            const remoteValue = conflict.find(
              ({ actorId }) => actorId === remoteState._actorId
            )?.value;
            assert(localValue && remoteValue);
            ret.conflicts[sampleId][conflictingProp] = {
              localValue,
              remoteValue,
            };
          }
        }
        return ret;
      }
      return localState.cachedState;
    }
  }

  private static _upgradeLocalState(
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
      return this._syncQueue.add(() =>
        this._localBackend.setState(
          localState.userId,
          MergeableMainState.encode(localState.cachedState)
        )
      );
    }
  }

  private async _syncRemoteState() {
    const remoteState = get(this._remoteState);
    assert(remoteState, "syncing non-existant remote state");
    return this._syncQueue.add(() =>
      this._remoteBackend.setState(
        REMOTE_STATE_KEY,
        MergeableMainState.encode(remoteState)
      )
    );
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

  private async _onSignIn(signedInState: SignedInState) {
    if (signedInState.state === SignedInTypes.Offline) {
      this.syncing._set(false);
      return;
    }
    let syncLocalState = false,
      syncRemoteState = false;
    if (signedInState.state === SignedInTypes.SignedIn) {
      this.syncing._set(true);
      let remoteState = await this._fetchRemoteState();

      this._localState.update((localState) => {
        if ("cachedState" in localState) {
          if (localState.userId === signedInState.user) {
            // Existing cached user signed in
            if (!remoteState) {
              remoteState = mergeableClone(localState.cachedState);
            } else {
              localState.cachedState = mergeableMerge(
                localState.cachedState,
                remoteState
              );
              if (!localState.cachedState._conflicts) {
                remoteState = mergeableMerge(
                  remoteState,
                  localState.cachedState
                );
              }
            }
            syncLocalState = syncRemoteState = true;
          } else {
            // New user signed in. Throw away the cache.
            if (!remoteState) {
              remoteState = mergeableInit(StateManager._createNewMainState());
              syncRemoteState = true;
            }
            localState.cachedState = mergeableClone(remoteState);
            localState.userId = signedInState.user;
            syncLocalState = true;
          }
        } else {
          // Upgrade local state to cached state
          ({ localState, remoteState } = StateManager._upgradeLocalState(
            localState,
            remoteState,
            signedInState.user
          ));
          syncLocalState = syncRemoteState = true;
        }
        return localState;
      });
      this._remoteState.set(remoteState);
    } else if (signedInState.state === SignedInTypes.SignedOut) {
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
    if (syncLocalState || syncRemoteState) {
      await Promise.all([
        syncLocalState ? this._syncLocalState() : Promise.resolve(),
        syncRemoteState ? this._syncRemoteState() : Promise.resolve(),
      ]);
    } else {
      this.syncing._set(false);
    }
  }
}

export default StateManager;
