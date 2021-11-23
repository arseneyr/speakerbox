import * as t from "io-ts";
import { v4 } from "uuid";
import type { Readable } from "svelte/store";
import { JsonFromString } from "io-ts-types";
import stringify from "json-stable-stringify";

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
export const REMOTE_STATE_KEY = "remote-state.json";

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

export type SampleData = Blob;
export interface SampleParams {
  readonly id: string;
  readonly title: string;
  readonly data: SampleData;
}

export const MainStateFromString = JsonFromString.pipe(MainState);
export const BlobFromMainState = (state: MainState) =>
  new Blob([stringify(state)], {
    type: "application/json",
  });

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
  setState(key: UserId, cachedState: MainState): Promise<unknown>;
};

export type IRemoteBackend = ICommonBackend & {
  setState(key: typeof REMOTE_STATE_KEY, remoteState: Blob): Promise<unknown>;
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
