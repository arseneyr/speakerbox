import * as t from "io-ts";
import { getOrElse, getOrElseW, map } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type { RemoteStorageBackend, StorageBackend } from "./types";
import type { BinaryDocument, Doc } from "automerge";
import type AutomergeType from "automerge";
import { derived, writable } from "svelte/store";
import { assert } from "./utils";

async function loadAutomerge(): Promise<void> {
  Automerge = (await import("automerge")).default;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta.env.DEV) {
    Automerge.init({ freeze: true });
  }
}

let Automerge: typeof AutomergeType;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const AutomergeCodec = <C extends t.Mixed>(base: C) =>
  new t.Type<Doc<t.TypeOf<C>>, Uint8Array, unknown>(
    "Automerge Doc",
    (input): input is Doc<t.TypeOf<C>> => base.is(input),
    (input, context) => {
      if (input instanceof Uint8Array) {
        try {
          return base.validate(
            Automerge.load(input as BinaryDocument),
            context
          );
        } catch {
          return t.failure(input, context);
        }
      }
      return t.failure(input, context);
    },
    (input) => Automerge.save(input)
  );

const SampleAddTypes = t.keyof({
  UPLOAD: null,
  RECORD_DESKTOP: null,
});
const LocalSettings = t.partial({
  outputDevice: t.string,
  lastSampleAddType: SampleAddTypes,
});
const SampleInfo = t.type({
  // mimeType: t.string,
  title: t.string,
  revisionId: t.string,
});
// const InitEditType = t.type({
//   type: t.literal("init"),
//   revision: t.string,
// });
// const CutEditType = t.type({
//   type: t.literal("cut"),
//   start: t.number,
//   end: t.number,
// });
// const CropEditType = t.type({
//   type: t.literal("cut"),
//   start: t.number,
//   end: t.number,
// });
const MainState = t.type({
  version: t.string,
  sampleList: t.readonlyArray(t.string),
  samples: t.record(t.string, SampleInfo),
});
const LocalStateCached = t.type({
  version: t.string,
  settings: LocalSettings,
  userId: t.string,
});
const LocalStateFull = t.type({
  version: t.string,
  settings: LocalSettings,
  mainState: MainState,
});
const LocalState = t.union([LocalStateCached, LocalStateFull]);
const MergableMainState = AutomergeCodec(MainState);

interface SyncManager {
  addSample(id: string, title: string, data: Blob | AudioBuffer): Promise<void>;
  updateSample(
    id: string,
    update: Partial<{ title: string; data: Blob | AudioBuffer }>
  ): Promise<void>;
  setSampleOrder(ids: string[]): Promise<void>;
  setSettings(settings: t.TypeOf<typeof LocalSettings>): Promise<void>;
}

const LOCAL_STATE_KEY = "local";
const REMOTE_STATE_KEY = "remote";
const LOCAL_VERSION = "1.0";
const MAIN_VERSION = "1.0";

type InternalLocalState =
  | t.TypeOf<typeof LocalStateFull>
  | (t.TypeOf<typeof LocalStateCached> & {
      cachedState: t.TypeOf<typeof MergableMainState>;
    });

class SyncManager {
  private readonly _remoteState = writable<t.TypeOf<
    typeof MergableMainState
  > | null>(null);
  private readonly _localState = writable<InternalLocalState>();
  private readonly _sampleDataCache = writable(
    new Map<string, Blob | AudioBuffer>()
  );

  public readonly state = derived(
    [this._localState, this._sampleDataCache],
    this._derivedStore.bind(this)
  );

  constructor(
    private readonly _localBackend: StorageBackend,
    private readonly _remoteBackend: RemoteStorageBackend
  ) {
    this._init();
  }

  private async _init() {
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
                return SyncManager._createNewLocalState();
              })
            );
          }
          return state;
        }),
        getOrElseW((err) => {
          console.log(err);
          return SyncManager._createNewLocalState();
        })
      )
    );

    this._remoteBackend.signedInUser.subscribe(this._onSignIn.bind(this));
  }

  private _derivedStore([localState, sampleDataCache]: [
    InternalLocalState,
    Map<string, Blob | AudioBuffer>
  ]) {
    if (!localState) {
      return null;
    }
    const mainState = LocalStateFull.is(localState)
      ? localState.mainState
      : localState.cachedState;
    return mainState.sampleList.map((id) => {
      const sample = mainState.samples[id];
      const sampleData = sampleDataCache.get(id);

      assert(!!sample, "missing sample metadata");

      return {
        id,
        title: sample.title,
        sampleData,
      };
    });
  }

  private _updateMainState(
    updateFn: (state: t.TypeOf<typeof MainState>) => void
  ) {
    this._localState.update((state) => {
      if (LocalStateFull.is(state)) {
        updateFn(state.mainState);
      } else {
        state.cachedState = Automerge.change(state.cachedState, updateFn);
        this._remoteState.update(
          (remoteState) =>
            remoteState && Automerge.merge(remoteState, state.cachedState)
        );
      }
      return state;
    });
  }

  // private _updateLocalStateFull(
  //   updateFn: (state: t.TypeOf<typeof MainState>) => void
  // ) {
  //   this._localState.update((state) => {
  //     assert(
  //       LocalStateFull.is(state),
  //       "Updating local state when it's cached!"
  //     );
  //     updateFn(state.mainState);
  //     return state;
  //   });
  // }

  // private _updateLocalStateCached(
  //   updateFn: (state: t.TypeOf<typeof MainState>) => void
  // ) {
  //   this._cachedState.update((state) => {
  //     assert(state !== null, "updating a null cache!");
  //     return Automerge.change(state, updateFn);
  //   });
  // }

  // private _isLocalStateCached(): this is {
  //   _localState: Writable<t.TypeOf<typeof LocalStateCached>>;
  // } & this {
  //   const localState = get(this._localState);
  //   assert(localState !== null);
  //   if (LocalStateCached.is(localState)) {
  //     return true;
  //   }
  //   return false;
  // }

  private static _createNewMainState(): t.TypeOf<typeof MainState> {
    return {
      version: MAIN_VERSION,
      sampleList: [],
      samples: {},
    };
  }

  private static _createNewLocalState(): t.TypeOf<typeof LocalStateFull> {
    return {
      version: LOCAL_VERSION,
      settings: {},
      mainState: SyncManager._createNewMainState(),
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
    return MergableMainState.decode(encodedCache);
  }

  private async _fetchRemoteState() {
    const [encodedRemoteState] = await Promise.all([
      this._remoteBackend.getState(REMOTE_STATE_KEY),
      loadAutomerge(),
    ]);
    return pipe(
      MergableMainState.decode(encodedRemoteState),
      getOrElse((err) => {
        console.log(err);
        const newState = Automerge.from(SyncManager._createNewMainState());
        this._remoteBackend.setState(
          REMOTE_STATE_KEY,
          MergableMainState.encode(newState)
        );
        return newState;
      })
    );
  }

  private async _onSignIn(userId: string | false | null) {
    if (userId === null) {
      return;
    }
    if (t.string.is(userId)) {
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
            localState.cachedState = Automerge.from(remoteState);
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
            cachedState: Automerge.from(remoteState),
          };
        }
        return localState;
      });
      this._remoteState.set(remoteState);
    } else if (userId === false) {
      this._localState.update((localState) => {
        if ("userId" in localState) {
          // The user has logged out. We change cached state to local state
          this._localBackend.deleteState(localState.userId);
          localState = SyncManager._createNewLocalState();
        }
        return localState;
      });
      this._remoteState.set(null);
    }
  }
}

export default SyncManager;
export { AutomergeCodec, loadAutomerge };
