import t from "io-ts";
import { isLeft, map, isRight, getOrElse, fold, chainFirst } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type { RemoteStorageBackend, StorageBackend } from "./types";
import Automerge, { Doc, BinaryDocument } from "automerge";
import { privateWritable } from "./utils";

const AutomergeCodec = <C extends t.Mixed>(base: C) =>
  new t.Type<Doc<t.TypeOf<C>>, BinaryDocument, unknown>(
    "Automerge Doc",
    (input): input is Doc<t.TypeOf<C>> => base.is(input),
    (input, context) => {
      if (input instanceof Uint8Array && "__binaryDocument" in input) {
        try {
          return base.validate(Automerge.load(input), context);
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
  mimeType: t.string,
  title: t.string,
  revisionId: t.string,
});
const InitEditType = t.type({
  type: t.literal("init"),
  revision: t.string,
});
const CutEditType = t.type({
  type: t.literal("cut"),
  start: t.number,
  end: t.number,
});
const CropEditType = t.type({
  type: t.literal("cut"),
  start: t.number,
  end: t.number,
});
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
const LOCAL_VERSION = "1.0";
const MAIN_VERSION = "1.0";

class SyncManager {
  private _cachedState = privateWritable<Doc<
    t.TypeOf<typeof MainState>
  > | null>(null);
  private _localFullState = privateWritable<t.TypeOf<
    typeof LocalStateFull
  > | null>(null);
  private _localCachedState: t.TypeOf<typeof LocalStateCached> | null = null;

  constructor(
    private readonly _localBackend: StorageBackend,
    private readonly _remoteBackend: RemoteStorageBackend
  ) {}

  private async _init() {
    const encodedState = await this._localBackend.getState(LOCAL_STATE_KEY);
    let fullState, cachedState;
    pipe(
      LocalStateCached.decode(encodedState),
      chainFirst()
      fold(
        (err) => {},
        (cachedState) => (this._localCachedState = cachedState)
      )
    );
  }

  private static _createNewLocalState(): t.TypeOf<typeof LocalStateFull> {
    return {
      version: LOCAL_VERSION,
      settings: {},
      mainState: {
        version: MAIN_VERSION,
        sampleList: [],
        samples: {},
      },
    };
  }

  private _onSignIn(userId: string | null) {}
}
