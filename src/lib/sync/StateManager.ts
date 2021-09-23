import { derived, writable } from "svelte/store";
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
import { loadAutomerge } from "./automerge";
import type AutomergeType from "automerge";
import type { Patch } from "automerge";
import { assert } from "$lib/utils";
import { pipe } from "fp-ts/lib/function";
import { getOrElse, getOrElseW, map } from "fp-ts/lib/Either";

let Automerge: typeof AutomergeType;

type InternalLocalState =
  | LocalStateFull
  | (LocalStateCached & { cachedState: MergeableMainState });

class StateManager {
  private readonly _localState = writable<InternalLocalState>();
  private readonly _remoteState = writable<MergeableMainState | null>(null);

  public readonly mainState = derived(
    this._localState,
    this._derivedStore.bind(this)
  );

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {}

  public async init() {
    const localState = await this._fetchLocalState();

    this._localState.set(
      await pipe(
        localState,
        map(async (state) => {
          if (LocalStateCached.is(state)) {
            return pipe(
              await this._fetchCachedState(state.userId),
              map((cachedState) => ({ ...state, cachedState })),
              getOrElseW((err) => {
                console.log(err);
                return StateManager._createNewLocalState();
              })
            );
          }
          return state;
        }),
        getOrElseW((err) => {
          console.log(err);
          return StateManager._createNewLocalState();
        })
      )
    );

    this._remoteBackend.signedInUser.subscribe(this._onSignIn.bind(this));
  }

  public updateMainState(
    updateFn: (state: MainState) => void
  ): [Promise<unknown>, Promise<unknown>] {
    let localSyncPromise!: Promise<unknown>;
    let remoteSyncPromise: Promise<unknown> | undefined;
    this._localState.update((state) => {
      if (LocalStateFull.is(state)) {
        updateFn(state.mainState);
        localSyncPromise = this._localBackend.setState(LOCAL_STATE_KEY, state);
      } else {
        state.cachedState = this._changeState(state.cachedState, updateFn);
        localSyncPromise = this._localBackend.setState(
          state.userId,
          MergeableMainState.encode(state.cachedState)
        );
        this._remoteState.update((remoteState) => {
          if (remoteState) {
            remoteState = this._mergeState(remoteState, state.cachedState);
            remoteSyncPromise = this._remoteBackend.setState(
              REMOTE_STATE_KEY,
              MergeableMainState.encode(remoteState)
            );
          }
          return remoteState;
        });
      }
      return state;
    });

    return [
      localSyncPromise,
      Promise.all([
        localSyncPromise,
        ...(remoteSyncPromise ? [remoteSyncPromise] : []),
      ]),
    ];
  }

  private _patch?: Patch;
  private _patchCallback(patch: Patch) {
    this._patch = patch;
  }

  private _initState(state: MainState) {
    return Automerge.from(state, {
      patchCallback: this._patchCallback.bind(this),
    });
  }

  private _mergeState(first: MergeableMainState, second: MergeableMainState) {
    const newFirst = Automerge.merge(first, second);
    const patch = this._patch;
    this._patch = undefined;
    assert(patch, "patch not generated after merge!");
    return newFirst;
  }

  private _changeState(
    doc: MergeableMainState,
    updateFn: (state: MainState) => void
  ) {
    const ret = Automerge.change(doc, updateFn);
    assert(this._patch);
    this._patch = undefined;
    return ret;
  }

  private _derivedStore(localState: InternalLocalState | undefined) {
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

  private async _fetchLocalState() {
    const encodedState = await this._localBackend.getState(LOCAL_STATE_KEY);
    return LocalState.decode(encodedState);
  }

  private async _fetchCachedState(userId: string) {
    const [encodedCache] = await Promise.all([
      this._localBackend.getState(userId),
      loadAutomerge(),
    ]);
    return MergeableMainState.decode(encodedCache);
  }

  private async _fetchRemoteState() {
    const [encodedRemoteState] = await Promise.all([
      this._remoteBackend.getState(REMOTE_STATE_KEY),
      loadAutomerge(),
    ]);
    return pipe(
      MergeableMainState.decode(encodedRemoteState),
      getOrElse((err) => {
        console.log(err);
        const newState = Automerge.from(StateManager._createNewMainState());
        this._remoteBackend.setState(
          REMOTE_STATE_KEY,
          MergeableMainState.encode(newState)
        );
        return newState;
      })
    );
  }
  private async _onSignIn(userId: string | false | null) {
    if (userId === null) {
      return;
    }
    if (typeof userId === "string") {
      let remoteState = await this._fetchRemoteState();

      this._localState.update((localState) => {
        if ("cachedState" in localState) {
          if (localState.userId === userId) {
            // Existing cached user signed in
            remoteState = Automerge.merge(remoteState, localState.cachedState);
            localState.cachedState = Automerge.merge(
              localState.cachedState,
              remoteState
            );
          } else {
            // New user signed in. Throw away the cache.
            localState.cachedState = this._initState(remoteState);
            localState.userId = userId;
          }
        } else {
          // Upgrade local state to cached state
          remoteState = Automerge.merge(
            remoteState,
            Automerge.from(localState.mainState)
          );
          localState = {
            version: localState.version,
            settings: localState.settings,
            userId,
            cachedState: this._initState(remoteState),
          };
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
        }
        return localState;
      });
    }
  }
}

export default StateManager;
