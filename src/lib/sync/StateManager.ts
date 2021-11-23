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
  REMOTE_STATE_KEY,
  SampleInfo,
  SignedInState,
  SignedInTypes,
  RetryError,
  UserId,
  MainStateFromString,
  BlobFromMainState,
} from "$lib/types";
import { assert, privateWritable } from "$lib/utils";
import { pipe } from "fp-ts/lib/function";
import { getOrElseW } from "fp-ts/lib/Either";

type InternalStateCached = LocalStateCached & {
  cachedState: MainState;
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
    this._localState._update((state) => {
      if (LocalStateFull.is(state)) {
        updateFn(state.mainState);
      } else {
        assert(LocalStateCached.is(state));
        updateFn(state.cachedState);
      }
      return state;
    });
    this._syncLocalState();
    this._syncRemoteState();
  }

  private _derivedMainStore(
    localState?: InternalState
  ): StateManagerOutputState {
    if (!localState) {
      return null;
    }

    if (LocalStateFull.is(localState)) {
      return {
        samples: localState.mainState.samples,
        sampleList: localState.mainState.sampleList,
      };
    } else {
      assert(LocalStateCached.is(localState));
      return {
        samples: localState.cachedState.samples,
        sampleList: localState.cachedState.sampleList,
      };
    }
  }

  private static _upgradeLocalState(
    localState: LocalStateFull,
    remoteState: MainState | null,
    userId: UserId
  ): InternalStateCached {
    let newCachedState: MainState;
    if (!remoteState) {
      newCachedState = localState.mainState;
    } else {
      newCachedState = remoteState;
      for (const [id, sample] of Object.entries(localState.mainState.samples)) {
        assert(
          remoteState.samples[id] === undefined,
          "Sample ID collision when upgrading state!"
        );

        newCachedState.samples[id] = sample;
      }
      newCachedState.sampleList.push(...localState.mainState.sampleList);
    }

    return {
      version: localState.version,
      settings: localState.settings,
      userId,
      cachedState: newCachedState,
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
            localState.cachedState
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
            const localState = get(this._localState);
            if (!LocalStateCached.is(localState)) {
              return;
            }
            try {
              await this._remoteBackend.setState(
                REMOTE_STATE_KEY,
                BlobFromMainState(localState.cachedState)
              );
              return;
            } catch (e) {
              if (!(e instanceof RetryError)) {
                console.log(e);
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

  private _beginSync() {
    this._syncCounter._update((c) => c + 1);
  }

  private _endSync() {
    this._syncCounter._update((c) => c - 1);
  }

  private _runSynced<T>(fn: () => T): T {
    this._beginSync();
    try {
      const ret: any = fn();
      if (typeof ret?.finally === "function") {
        return ret.finally(() => {
          this._endSync();
        });
      }
      this._endSync();
      return ret;
    } catch (e) {
      this._endSync();
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
    const encodedCache = await this._localBackend.getState(userId);
    if (!encodedCache) {
      return null;
    }
    return pipe(
      MainState.decode(encodedCache),
      getOrElseW((err) => {
        console.log(err);
        this._localBackend.deleteState(userId);
        return null;
      })
    );
  }

  private async _fetchRemoteState() {
    const encodedRemoteState = await this._remoteBackend.getState(
      REMOTE_STATE_KEY
    );
    if (!encodedRemoteState || !(encodedRemoteState instanceof Blob)) {
      return null;
    }
    return pipe(
      MainStateFromString.decode(await encodedRemoteState.text()),
      getOrElseW((err) => {
        console.log(err);
        return null;
      })
    );
  }

  public async poll(): Promise<void> {
    return this._runSynced(async () => {
      const newRemoteState = await this._fetchRemoteState();
      if (!newRemoteState) {
        return;
      }
      this._localState._update((localState) => {
        if (LocalStateFull.is(localState)) {
          return localState;
        }
        localState.cachedState = newRemoteState;
        this._syncLocalState();
        return localState;
      });
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
