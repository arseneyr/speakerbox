import { derived, get, Readable } from "svelte/store";
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
  RetryError,
  UserId,
} from "$lib/types";
import {
  loadAutomerge,
  mergeableChange,
  mergeableClone,
  mergeableGetConflicts,
  mergeableHasChanged,
  mergeableInit,
  mergeableMerge,
} from "./automerge";
import { assert, Entries, privateWritable } from "$lib/utils";
import { pipe } from "fp-ts/lib/function";
import { getOrElseW } from "fp-ts/lib/Either";

type InternalStateCached = LocalStateCached & {
  cachedState: MergeableMainState;
};
type InternalState = LocalStateFull | InternalStateCached;

type OutputConflicts<T> = {
  [sampleId: string]: {
    [K in keyof T]?: {
      localValue: T[K];
      remoteValues: T[K][];
    };
  };
};
export type StateManagerOutputState =
  | (Pick<MainState, "sampleList" | "samples"> & {
      conflicts?: OutputConflicts<SampleInfo>;
    })
  | null;

class StateManager {
  private readonly _localState = privateWritable<InternalState>();
  private _remoteState: MergeableMainState | null = null;
  private readonly _syncCounter = privateWritable(0);

  public readonly mainState: Readable<StateManagerOutputState> = derived(
    this._localState,
    this._derivedMainStore.bind(this)
  );

  public readonly syncing = derived(this._syncCounter, (c) => c > 0);

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {}

  public async init(): Promise<typeof this> {
    const fetchedLocalState = await this._fetchLocalState();
    let internalLocalState: InternalState;
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

    this._localState._set(internalLocalState);
    this._remoteBackend.signedInUser.subscribe(this._onSignIn.bind(this));
    return this;
  }

  public updateMainState(updateFn: (state: MainState) => void): void {
    let syncRemoteState = false;
    let syncLocalState = false;
    this._localState._update((state) => {
      if (LocalStateFull.is(state)) {
        updateFn(state.mainState);
        syncLocalState = true;
      } else {
        assert(LocalStateCached.is(state));

        const newCachedState = mergeableChange<MainState>(
          state.cachedState,
          updateFn
        );
        syncLocalState = mergeableHasChanged(state.cachedState, newCachedState);
        if (syncLocalState) {
          state.cachedState = newCachedState;
        }
        if (this._remoteState) {
          const newRemoteState = mergeableMerge(
            this._remoteState,
            newCachedState
          );
          syncRemoteState = mergeableHasChanged(
            this._remoteState,
            newRemoteState
          );
          if (syncRemoteState) {
            this._remoteState = newRemoteState;
          }
        }
      }
      return state;
    });
    syncLocalState && this._syncLocalState();
    syncRemoteState && this._syncRemoteState();
  }

  private _derivedMainStore(
    localState?: InternalState
  ): StateManagerOutputState {
    if (!localState) {
      return null;
    }

    function filter(state: MainState) {
      return { samples: state.samples, sampleList: state.sampleList };
    }

    if (LocalStateFull.is(localState)) {
      return filter(localState.mainState);
    } else {
      const sampleConflicts = mergeableGetConflicts(localState.cachedState)
        ?.samples;
      const ret: StateManagerOutputState = filter(localState.cachedState);
      if (sampleConflicts) {
        // assert(this._remoteState);

        const conflicts = (ret.conflicts = {} as OutputConflicts<SampleInfo>);
        for (const [sampleId, sampleConflict] of Object.entries(
          sampleConflicts
        )) {
          for (const [conflictingProp, conflict] of Object.entries(
            sampleConflict
          ) as Entries<typeof sampleConflict>) {
            const localValue = conflict.find(
              ({ actorId }) => actorId === localState.cachedState._actorId
            )?.value;
            const remoteValues = conflict
              .filter(
                ({ actorId }) => actorId !== localState.cachedState._actorId
              )
              .map(({ value }) => value);
            assert(localValue && remoteValues);
            conflicts[sampleId] = {
              [conflictingProp]: {
                localValue,
                remoteValues,
              },
            };
          }
        }
      }
      return ret;
    }
  }

  private static _moveSamplesIntoState(
    destination: MergeableMainState,
    source: MainState
  ): MergeableMainState {
    assert(
      destination.sampleList.filter((id) => source.sampleList.includes(id))
        .length === 0,
      "duplicate samples in remote/local sample list!"
    );
    assert(
      Object.keys(destination.samples).filter((id) =>
        Object.keys(source.samples).includes(id)
      ).length === 0,
      "duplicate samples in remote/local sample map!"
    );

    return mergeableChange(destination, (state) => {
      state.sampleList.push(...source.sampleList);
      for (const [k, v] of Object.entries(source.samples)) {
        state.samples[k] = v;
      }
    });
  }

  private static _upgradeLocalState(
    localState: LocalStateFull,
    remoteState: MergeableMainState | null,
    userId: UserId
  ): { localState: InternalStateCached; remoteState: MergeableMainState } {
    let newRemoteState: MergeableMainState, newCachedState: MergeableMainState;
    if (!remoteState) {
      newCachedState = mergeableInit(localState.mainState);
      newRemoteState = mergeableClone(newCachedState);
    } else {
      newRemoteState = StateManager._moveSamplesIntoState(
        remoteState,
        localState.mainState
      );
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
      version: MAIN_VERSION_1_0.value,
      sampleList: [],
      samples: {},
    };
  }

  private static _createNewLocalState(): LocalStateFull {
    return {
      version: LOCAL_VERSION_1_0.value,
      settings: {},
      mainState: StateManager._createNewMainState(),
    };
  }

  private async _syncLocalState() {
    return this._runSynced(async () => {
      const localState = get(this._localState);
      if (LocalStateFull.is(localState)) {
        await this._localBackend.setState(LOCAL_STATE_KEY, localState);
      } else {
        await Promise.all([
          this._localBackend.setState(LOCAL_STATE_KEY, {
            version: localState.version,
            settings: localState.settings,
            userId: localState.userId,
          }),
          this._localBackend.setState(
            localState.userId,
            MergeableMainState.encode(localState.cachedState)
          ),
        ]);
      }
    });
  }

  private _isRemoteSyncing = false;

  private async _syncRemoteState() {
    if (!this._isRemoteSyncing) {
      return this._runSynced(async () => {
        try {
          this._isRemoteSyncing = true;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (!this._remoteState) {
              return;
            }
            try {
              await this._remoteBackend.setState(
                REMOTE_STATE_KEY,
                MergeableMainState.encode(this._remoteState)
              );
              return;
            } catch (e) {
              if (!(e instanceof RetryError)) {
                console.log(e);
                this._remoteState = null;
                return;
              }
              await this.poll();
            }
          }
        } finally {
          this._isRemoteSyncing = false;
        }
      });
    }
  }

  private _acquireSyncLock() {
    this._syncCounter._update((c) => c + 1);
  }

  private _releaseSyncLock() {
    this._syncCounter._update((c) => c - 1);
  }

  private _runSynced<T>(fn: () => T): T {
    this._acquireSyncLock();
    try {
      const ret: any = fn();
      if (typeof ret?.finally === "function") {
        return ret.finally(() => {
          this._releaseSyncLock();
        });
      }
      this._releaseSyncLock();
      return ret;
    } catch (e) {
      this._releaseSyncLock();
      throw e;
    }
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
    if (!encodedCache) {
      return null;
    }
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
    if (!encodedRemoteState) {
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

  public async poll(): Promise<void> {
    return this._runSynced(async () => {
      const newRemoteState = await this._fetchRemoteState();
      if (!this._remoteState || !newRemoteState) {
        return;
      }
      this._localState._update((localState) => {
        assert("cachedState" in localState);
        assert(newRemoteState);
        assert(this._remoteState);

        if (newRemoteState._actorId !== this._remoteState._actorId) {
          // Two endpoints tried to upgrade local states at the same time.
          // The one already stored wins.

          localState.cachedState = StateManager._moveSamplesIntoState(
            mergeableClone(newRemoteState),
            localState.cachedState
          );
        } else {
          localState.cachedState = mergeableMerge(
            localState.cachedState,
            newRemoteState
          );
        }

        this._remoteState = mergeableMerge(
          newRemoteState,
          localState.cachedState
        );
        return localState;
      });
      this._syncLocalState();
      this._syncRemoteState();
    });
  }

  private _signedInState: SignedInState | null = null;

  private async _onSignIn(signedInState: SignedInState | null) {
    this._signedInState = signedInState;

    if (!signedInState || signedInState.state === SignedInTypes.Offline) {
      this._remoteState = null;
      return;
    }
    return this._runSynced(async () => {
      let syncLocalState = false,
        syncRemoteState = false;

      if (signedInState.state === SignedInTypes.SignedIn) {
        let remoteState = await this._fetchRemoteState();
        if (signedInState !== this._signedInState) {
          return;
        }
        this._localState._update((localState) => {
          if ("cachedState" in localState) {
            if (localState.userId === signedInState.user) {
              // Existing cached user signed in
              if (!remoteState) {
                remoteState = mergeableClone(localState.cachedState);
                syncRemoteState = true;
              } else {
                const newCachedState = mergeableMerge(
                  localState.cachedState,
                  remoteState
                );
                const newRemoteState = mergeableMerge(
                  remoteState,
                  newCachedState
                );
                if (
                  mergeableHasChanged(localState.cachedState, newCachedState)
                ) {
                  localState.cachedState = newCachedState;
                  syncLocalState = true;
                }
                if (mergeableHasChanged(remoteState, newRemoteState)) {
                  remoteState = newRemoteState;
                  syncRemoteState = true;
                }
              }
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
        this._remoteState = remoteState;
      } else if (signedInState.state === SignedInTypes.SignedOut) {
        // The user has logged out. We change cached state to local state

        this._remoteState = null;
        this._localState._update((localState) => {
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
    }).catch((e) => {
      console.log(e);
    });
  }
}

export default StateManager;
