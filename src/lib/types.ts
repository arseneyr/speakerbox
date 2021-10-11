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

declare global {
  // interface EventTarget<
  //   T extends { [key: string]: unknown } = { [key: string]: unknown }
  // > {
  //   addEventListener<K extends keyof T>(
  //     type: K,
  //     listener: (event: CustomEvent<T[K]>) => void
  //   );
  //   dispatchEvent<K extends Extract<keyof T, string>>(event: CustomEvent<T[K]>);
  // }
  // eslint-disable-next-line no-var
  // var EventTarget: {
  //   new <
  //     T extends { [key: string]: unknown } = { [key: string]: unknown }
  //   >(): EventTarget<T>;
  //   prototype: EventTarget;
  // };
}

// interface TypedEventTarget<T extends { [key: string]: unknown }> {
//   addEventListener<K extends keyof T>(
//     type: K,
//     listener: (event: Event & { data: T[K] }) => void
//   );
//   dispatchEvent<K extends Extract<keyof T, string>>(event: TypedEvent<K, T[K]>);
// }

export interface StorageBackend {
  // getMainState(): Promise<unknown | null>;
  // setMainState(state: unknown): Promise<unknown>;
  getState(id: string): Promise<unknown | null>;
  setState(id: string, state: unknown): Promise<unknown>;
  deleteState(id: string): Promise<unknown>;

  // getSampleData(id: string): Promise<Blob | AudioBuffer | null>;
  // setSampleData(id: string, data: Blob | AudioBuffer): Promise<unknown>;

  // deleteSampleData(id: string): Promise<unknown>;

  // saveInvalidMainState?(state: unknown): Promise<unknown>;
}

export interface RemoteStorageBackend extends StorageBackend {
  signedInUser: Readable<string | false | null>;
  signIn(): Promise<void>;
}

// export function TypedEventTarget<
//   TBase extends GConstructor<EventTarget>,
//   EventMap extends { [key: string]: any }
// >(Base: TBase) {
//   return class TypedEventTarget extends Base {
//     public addEventListener<K extends Extract<keyof EventMap, string>>(
//       type: K,
//       listener: (ev: CustomEvent<EventMap[K]>) => void
//     ) {
//       return super.addEventListener(type, listener);
//     }

//     public dispatchEvent<V extends EventMap[keyof EventMap]>(
//       event: CustomEvent<V>
//     ) {
//       return super.dispatchEvent(event);
//     }

//     public removeEventListener<K extends Extract<keyof EventMap, string>>(
//       type: K,
//       listener: (ev: CustomEvent<EventMap[K]>) => void
//     ) {
//       return super.removeEventListener(type, listener);
//     }
//   };
// }

export enum SampleAddTypes {
  UPLOAD = "UPLOAD",
  RECORD_DESKTOP = "RECORD_DESKTOP",
}

export interface SavedSettings {
  lastSampleAddType?: SampleAddTypes;
}

export interface MainSavedState {
  version: string;
  samples: string[];
  settings: SavedSettings;
}

export interface SampleSavedState {
  id: string;
  title?: string;
}
