import { derived, get, type Readable } from "svelte/store";
import {
  type ILocalBackend,
  type IRemoteBackend,
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

  public readonly mainState: Readable<StateManagerOutputState> = derived(
    this._localState,
    this._derivedMainStore.bind(this)
  );

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {}

  public async init(): Promise<typeof this> {
    const fetchedLocalState = await this._fetchLocalState();
    let internalLocalState: InternalState;
    if (!fetchedLocalState) {
      internalLocalState = StateManager._createNewLocalFullState();
      await this._localBackend.setState(LOCAL_STATE_KEY, internalLocalState);
    } else if (LocalStateCached.is(fetchedLocalState)) {
      const cachedState = await this._fetchCachedState(
        fetchedLocalState.userId
      );
      if (!cachedState) {
        internalLocalState = StateManager._createNewLocalFullState();
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

        const newCachedState = mergeableChange(state.cachedState, updateFn);
        syncLocalState = mergeableHasChanged(state.cachedState, newCachedState);
        if (syncLocalState) {
          state.cachedState = newCachedState;
        }
        if (this._remoteState) {
          const newRemoteState = mergeableMerge(
            this._remoteState,
            newCachedState
          );
          syncRemoteState = newRemoteState !== this._remoteState;
          this._remoteState = newRemoteState;
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
      const sampleConflicts = mergeableGetConflicts(
        localState.cachedState
      )?.samples;
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

  private static _createNewMainState(): MainState {
    return {
      version: MAIN_VERSION_1_0.value,
      sampleList: [],
      samples: {},
    };
  }

  private static _createNewLocalFullState(): LocalStateFull {
    return {
      version: LOCAL_VERSION_1_0.value,
      settings: {},
      mainState: StateManager._createNewMainState(),
    };
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

  private static _merge(
    localState: InternalState | null,
    remoteState: MergeableMainState | null,
    userId: UserId
  ): { localState: InternalState; remoteState: MergeableMainState } {
    if (!localState || LocalStateFull.is(localState)) {
      let cachedState = remoteState
        ? mergeableClone(remoteState)
        : mergeableInit(
            localState?.mainState ?? StateManager._createNewMainState()
          );
      if (remoteState && localState) {
        // Move existing local samples into new cached state
        cachedState = mergeableChange(cachedState, (state) => {
          assert(
            state.sampleList.filter((id) =>
              localState.mainState.sampleList.includes(id)
            ).length === 0,
            "duplicate samples in remote/local sample list!"
          );
          assert(
            Object.keys(state.samples).filter((id) =>
              Object.keys(localState.mainState.samples).includes(id)
            ).length === 0,
            "duplicate samples in remote/local sample map!"
          );

          state.sampleList.push(...localState.mainState.sampleList);
          for (const [key, val] of Object.entries(
            localState.mainState.samples
          )) {
            state.samples[key] = val;
          }
        });
      }

      const newRemoteState = remoteState
        ? mergeableMerge(remoteState, cachedState)
        : mergeableClone(cachedState);
      return {
        localState: {
          version: localState?.version ?? LOCAL_VERSION_1_0.value,
          settings: localState?.settings ?? {},
          userId,
          cachedState,
        },
        remoteState: newRemoteState,
      };
    }

    assert(userId === localState.userId);

    const newRemoteState = remoteState
      ? mergeableMerge(remoteState, localState.cachedState)
      : mergeableClone(localState.cachedState);

    const newCachedState = mergeableMerge(
      localState.cachedState,
      newRemoteState
    );

    return {
      localState:
        newCachedState === localState.cachedState
          ? localState
          : { ...localState, cachedState: newCachedState },
      remoteState: newRemoteState,
    };
  }

  public async signIn(userId: UserId) {
    assert(!this._remoteState);

    let remoteState: MergeableMainState | null;
    const localStatePromise = (async () => {
      const localState = get(this._localState);
      if (LocalStateCached.is(localState) && userId !== localState.userId) {
        return {
          version: LOCAL_VERSION_1_0.value,
          settings: {},
          userId,
          cachedState:
            (await this._fetchCachedState(userId)) ??
            mergeableInit(StateManager._createNewMainState()),
        };
      }
      return localState;
    })();

    try {
      remoteState = await this._fetchRemoteState();
    } catch (e) {
      console.error(e);
    }

    let localState = await localStatePromise;

    ({ localState, remoteState } = StateManager._merge(
      localState,
      remoteState,
      userId
    ));
  }
}

export default StateManager;
