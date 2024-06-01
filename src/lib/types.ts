import * as t from "io-ts";
import { v4 } from "uuid";
import { mergeableLoad, mergeableSave } from "$lib/reduxStore/automerge";
import type { Readable } from "svelte/store";
import type { Doc } from "automerge";
import type { Validation } from "io-ts";

export interface Player {
  play(): void;
  stop(): void;
  destroy(): void;
  playing: Readable<boolean>;
  duration: number;
}

export class AbortError extends Error {
  constructor() {
    super();
    this.name = "AbortError";
  }
}

export const LOCAL_STATE_KEY = "local";
export const REMOTE_STATE_KEY = "remote";

export const LOCAL_VERSION_1_0 = t.literal("1.0");
export type LOCAL_VERSION_1_0 = t.TypeOf<typeof LOCAL_VERSION_1_0>;

export const MAIN_VERSION_1_0 = t.literal("1.0");
export type MAIN_VERSION_1_0 = t.TypeOf<typeof MAIN_VERSION_1_0>;

interface RevisionIdBrand {
  readonly RevisionId: unique symbol;
}
export const RevisionId = t.brand(
  t.string,
  (r): r is t.Branded<string, RevisionIdBrand> => r.startsWith("revId-"),
  "RevisionId"
);
export type RevisionId = t.TypeOf<typeof RevisionId>;
export function generateRevisionId(): RevisionId {
  return ("revId-" + v4()) as RevisionId;
}

interface UserIdBrand {
  readonly UserId: unique symbol;
}
export const UserId = t.brand(
  t.string,
  (u): u is t.Branded<string, UserIdBrand> => true,
  "UserId"
);
export type UserId = t.TypeOf<typeof UserId>;

export const SampleAddTypes = t.keyof({
  UPLOAD: null,
  RECORD_DESKTOP: null,
});
export const LocalSettings = t.partial({
  outputDevice: t.string,
  lastSampleAddType: SampleAddTypes,
});
export const SampleInfo = t.type({
  title: t.string,
  revisionId: RevisionId,
});
export const MainState = t.type({
  version: MAIN_VERSION_1_0,
  sampleList: t.array(t.string),
  samples: t.record(t.string, SampleInfo),
});
export const LocalStateCached = t.type({
  version: LOCAL_VERSION_1_0,
  settings: LocalSettings,
  userId: UserId,
});
export const LocalStateFull = t.type({
  version: LOCAL_VERSION_1_0,
  settings: LocalSettings,
  mainState: MainState,
});
export const LocalState = t.union([LocalStateCached, LocalStateFull]);

export type SampleAddTypes = t.TypeOf<typeof SampleAddTypes>;
export type LocalSettings = t.TypeOf<typeof LocalSettings>;
export type SampleInfo = t.TypeOf<typeof SampleInfo>;
export type MainState = t.TypeOf<typeof MainState>;
export type LocalStateCached = t.TypeOf<typeof LocalStateCached>;
export type LocalStateFull = t.TypeOf<typeof LocalStateFull>;
export type LocalState = t.TypeOf<typeof LocalState>;
export type MergeableMainState = t.TypeOf<typeof MergeableMainState>;

export type SampleData = Blob;
export interface SampleParams {
  readonly id: string;
  readonly title: string;
  readonly data: SampleData;
}

export interface ISyncManager {
  addSample(params: SampleParams): Promise<unknown>;
  updateSample(
    update: Pick<SampleParams, "id"> & Partial<SampleParams>
  ): Promise<unknown>;
  moveSample(oldIndex: number, newIndex: number): Promise<unknown>;
  setSettings(settings: t.TypeOf<typeof LocalSettings>): Promise<unknown>;
}

export const enum SignedInTypes {
  SignedIn = "SignedIn",
  SignedOut = "SignedOut",
  Offline = "Offline",
}

export type SignedInState =
  | { state: SignedInTypes.SignedIn; user: UserId }
  | { state: SignedInTypes.SignedOut }
  | { state: SignedInTypes.Offline };

interface ICommonBackend {
  getState(key: string): Promise<unknown>;
  setState(key: string, state: unknown): Promise<unknown>;
  deleteState(key: string): Promise<unknown>;
  getStateKeys(): Promise<string[]>;
}

export type ILocalBackend = ICommonBackend & {
  setState(
    key: typeof LOCAL_STATE_KEY,
    localState: t.TypeOf<typeof LocalState>
  ): Promise<unknown>;
  setState(
    key: UserId,
    cachedState: t.OutputOf<typeof MergeableMainState>
  ): Promise<unknown>;
};

export type IRemoteBackend = ICommonBackend & {
  setState(
    key: typeof REMOTE_STATE_KEY,
    cachedState: t.OutputOf<typeof MergeableMainState>
  ): Promise<unknown>;
  signedInUser: Readable<SignedInState | null>;
};

export interface ISampleDataBackend {
  getState(key: RevisionId): Promise<SampleData | null>;
  setState(key: RevisionId, data: SampleData): Promise<unknown>;
  deleteState(key: RevisionId): Promise<unknown>;
}

export class RetryError extends Error {
  constructor() {
    super();
    this.name = "RetryError";
  }
}

export const AutomergeCodec = <C extends t.Mixed>(base?: C) =>
  new t.Type<Doc<t.TypeOf<C>>, Uint8Array, unknown>(
    "Automerge Doc",
    (input): input is Doc<t.TypeOf<C>> =>
      typeof input === "object" && input !== null && (!base || base.is(input)),
    (input, context) => {
      try {
        if (!(input instanceof Uint8Array)) {
          throw new Error("non arraybuffer passed");
        }
        const doc = mergeableLoad(input);
        return (
          (base?.validate(doc, context) as Validation<Doc<t.TypeOf<C>>>) ||
          t.success(doc)
        );
      } catch (e: unknown) {
        return t.failure(
          input,
          context,
          e instanceof Error ? e.message : undefined
        );
      }
    },
    (input) => mergeableSave(input)
  );

export const MergeableMainState = AutomergeCodec(MainState);

interface Newable {
  new (...args: any[]): any;
}

export function instanceOf<C extends Newable>(C: C): t.Type<InstanceType<C>> {
  return new t.Type<InstanceType<C>>(
    `instanceOf(${C.name})`,
    (v): v is InstanceType<C> => v instanceof C,
    (i, c) =>
      i instanceof C ? t.success<InstanceType<C>>(i) : t.failure(i, c),
    (v) => v
  );
}
