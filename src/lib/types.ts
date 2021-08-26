import type { Readable } from "svelte/store";

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

export interface StorageBackend {
  getMainState(): Promise<MainSavedState | null>;
  setMainState(state: MainSavedState): Promise<unknown>;

  getSampleState(id: string): Promise<SampleSavedState | null>;
  setSampleState(state: SampleSavedState): Promise<unknown>;

  getSampleData(id: string): Promise<ArrayBuffer | AudioBuffer | null>;
  setSampleData(id: string, data: ArrayBuffer | AudioBuffer): Promise<unknown>;
}

export enum SampleAddTypes {
  UPLOAD = "UPLOAD",
  RECORD_DESKTOP = "RECORD_DESKTOP",
}

export interface MainSavedState {
  version: string;
  samples: string[];
  settings: {
    lastSampleAddType?: SampleAddTypes;
  };
}

export interface SampleSavedState {
  id: string;
  title?: string;
}
