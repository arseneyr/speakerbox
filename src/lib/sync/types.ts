import * as t from "io-ts";
import type { Readable } from "svelte/store";
import { AutomergeCodec } from "./automerge";

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
  revisionId: t.string,
});
export const MainState = t.type({
  version: t.string,
  sampleList: t.readonlyArray(t.string),
  samples: t.record(t.string, SampleInfo),
});
export const LocalStateCached = t.type({
  version: t.string,
  settings: LocalSettings,
  userId: t.string,
});
export const LocalStateFull = t.type({
  version: t.string,
  settings: LocalSettings,
  mainState: MainState,
});
export const LocalState = t.union([LocalStateCached, LocalStateFull]);
export const MergeableMainState = AutomergeCodec(MainState);

export type SampleAddTypes = t.TypeOf<typeof SampleAddTypes>;
export type LocalSettings = t.TypeOf<typeof LocalSettings>;
export type SampleInfo = t.TypeOf<typeof SampleInfo>;
export type MainState = t.TypeOf<typeof MainState>;
export type LocalStateCached = t.TypeOf<typeof LocalStateCached>;
export type LocalStateFull = t.TypeOf<typeof LocalStateFull>;
export type LocalState = t.TypeOf<typeof LocalState>;
export type MergeableMainState = t.TypeOf<typeof MergeableMainState>;

interface UserIdBrand {
  readonly UserId: unique symbol;
}
export const UserId = t.brand(
  t.string,
  (u): u is t.Branded<string, UserIdBrand> => t.string.is(u),
  "UserId"
);
export type UserId = t.TypeOf<typeof UserId>;

export type SampleId = string;
export type RevisionId = string;

export interface SampleParams {
  readonly id: SampleId;
  readonly title: string;
  readonly data: Blob | AudioBuffer;
}

export interface ISyncManager {
  addSample(params: SampleParams): Promise<void>;
  updateSample(
    // id: string,
    // update: Partial<{ title: string; data: Blob | AudioBuffer }>
    update: Pick<SampleParams, "id"> & Partial<SampleParams>
  ): Promise<void>;
  setSampleOrder(ids: SampleId[]): Promise<void>;
  setSettings(settings: t.TypeOf<typeof LocalSettings>): Promise<void>;
}

export const LOCAL_STATE_KEY = "local";
export const REMOTE_STATE_KEY = "remote";
export const LOCAL_VERSION_1_0 = "1.0";
export const MAIN_VERSION_1_0 = "1.0";

export interface ILocalBackend {
  getState(key: typeof LOCAL_STATE_KEY | string): Promise<unknown>;
  setState(
    key: typeof LOCAL_STATE_KEY,
    localState: t.TypeOf<typeof LocalState>
  ): Promise<unknown>;
  setState(
    key: string,
    cachedState: t.OutputOf<typeof MergeableMainState>
  ): Promise<unknown>;
  deleteState(key: typeof LOCAL_STATE_KEY | string): Promise<unknown>;
  getSampleData(key: string): Promise<Blob | AudioBuffer | null>;
  setSampleData(key: string, data: Blob | AudioBuffer): Promise<unknown>;
  deleteSampleData(key: string): Promise<unknown>;
}

export interface IRemoteBackend {
  getState(key: typeof REMOTE_STATE_KEY): Promise<unknown>;
  setState(
    key: typeof REMOTE_STATE_KEY,
    cachedState: t.OutputOf<typeof MergeableMainState>
  ): Promise<unknown>;
  deleteState(key: typeof REMOTE_STATE_KEY): Promise<unknown>;
  getSampleData(key: string): Promise<Blob | AudioBuffer | null>;
  setSampleData(key: string, data: Blob | AudioBuffer): Promise<unknown>;
  deleteSampleData(key: string): Promise<unknown>;
  signedInUser: Readable<string | false | null>;
}
