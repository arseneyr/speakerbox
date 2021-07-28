import audioContext from "$lib/audioContext";
import { lazySharedSwitch, DeferredReplaySubject } from "$lib/utils";
import {
  BehaviorSubject,
  merge,
  Observable,
  ObservableInput,
  of,
  ReplaySubject,
  Subject,
} from "rxjs";
import type { ConnectableObservableLike } from "rxjs/internal/observable/connectable";
import { first, map } from "rxjs/operators";
import { writable } from "svelte/store";
import { v4 } from "uuid";
import { playerGenerator } from "./player";
import type { ISampleStore, IPlayer } from "./types";

const VERSION = "1.0";

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

let backend: StorageBackend | null = null;

export const mainStore = writable<MainSavedState | null>(null);

export async function initialize(newBackend: StorageBackend): Promise<void> {
  backend = newBackend;
  let mainSavedState = await backend.getMainState();
  if (!mainSavedState) {
    mainSavedState = { version: VERSION, samples: [], settings: {} };
  }
  mainStore.set(mainSavedState);
}

export class SampleStore implements ISampleStore {
  private readonly _encodedAudio$ = new DeferredReplaySubject<ArrayBuffer>();
  private readonly _decodedAudio$ = new Subject<AudioBuffer>();
  private readonly _title$ = new Subject<ObservableInput<string | null>>();

  public readonly title = this._createTitleObservable();

  public readonly player: ConnectableObservableLike<IPlayer | null> = playerGenerator(
    this._encodedAudio$,
    this._decodedAudio$
  );
  public readonly audioBuffer: ConnectableObservableLike<AudioBuffer> = this._createAudioBufferObservable();

  private constructor(public readonly id: string) {
    this.audioBuffer.connect();
    this.player.connect();
    this.title.connect();
  }

  public setDecodedAudio(audioBuffer: AudioBuffer): void {
    this._decodedAudio$.next(audioBuffer);
  }

  public setTitle(title: string): void {
    this._title$.next(title);
  }

  private _createAudioBufferObservable(): ConnectableObservableLike<AudioBuffer> {
    const source$ = merge(
      this._decodedAudio$.pipe(map<AudioBuffer, Observable<AudioBuffer>>(of)),
      this._encodedAudio$.pipe(
        map((buf$) =>
          buf$.pipe(map((buf) => audioContext.decodeAudioData(buf)))
        )
      )
    );

    return lazySharedSwitch(() => new ReplaySubject(1))(source$);
  }

  private _createTitleObservable(): ConnectableObservableLike<string | null> {
    return lazySharedSwitch(() => new ReplaySubject(1))(this._title$);
  }

  // private _setEncodedData(data$: Observable<ArrayBuffer>): void {
  //   this._encodedAudio$.next(data$);
  // }

  private static _sampleMap = new Map<string, SampleStore>();
  private static _sampleMap$ = new BehaviorSubject(this._sampleMap);

  private static _addToSampleMap(store: SampleStore) {
    this._sampleMap.set(store.id, store);
    this._sampleMap$.next(this._sampleMap);
  }

  public static createNewSample(
    data: ArrayBuffer | Blob,
    title?: string
  ): SampleStore {
    const id = v4();
    const store = new SampleStore(id);
    store._title$.next(of(title ?? null));
    store._encodedAudio$.next(() =>
      data instanceof Blob ? data.arrayBuffer() : of(data)
    );

    this._addToSampleMap(store);
    return store;
  }

  public static getSample(id: string): SampleStore {
    let store = this._sampleMap.get(id);
    if (!store) {
      store = new SampleStore(id);
      Promise.all([backend.getSampleData(id), backend.getSampleState(id)]).then(
        ([buf, state]) => {
          buf instanceof AudioBuffer
            ? store._decodedAudio$.next(buf)
            : store._encodedAudio$.next(() => of(buf));
          store._title$.next(state.title);
        }
      );
      this._addToSampleMap(store);
    }
    return store;
  }
}
