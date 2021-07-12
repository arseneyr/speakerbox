import {
  derived,
  get,
  Readable,
  Unsubscriber,
  writable,
} from "svelte/store";
import { v4 } from "uuid";
import { privateWritable } from "$lib/utils";
import audioContext from "$lib/audioContext";
import PCancelable, { CancelError } from "p-cancelable";
import PQueue from "p-queue";

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

interface Player {
  play(): void;
  stop(): void;
}


export class SampleStore {
  public readonly title = writable<string | null>(null);
  public readonly playing = privateWritable(false);
  public readonly audioBuffer: Readable<AudioBuffer | null>;
  public readonly loading = privateWritable(true);
  public readonly error = privateWritable<string | null>(null);
  public readonly player: Readable<Player | null>;
  public readonly duration = privateWritable<number | null>(null);

  private readonly _encodedAudio = writable<ArrayBuffer | null>(null);
  private readonly _decodedAudio = writable<AudioBuffer | null>(null);
  private readonly _destroyCbs: Unsubscriber[];

  private constructor(public readonly id: string) {
    this.audioBuffer = derived(
      [this._encodedAudio, this._decodedAudio],
      this._setDecodedAudio.bind(this),
      null
    );
    this.player = derived(
      [this._encodedAudio, this._decodedAudio],
      this._createPlayer.bind(this),
      null
    );

    this._destroyCbs = [
      this.title.subscribe((newTitle) =>
        backend?.setSampleState({ id, title: newTitle ?? undefined })
      ),
    ];
  }

  public destroy(): void {
    this._destroyCbs.forEach((stop) => stop());
    SampleStore._sampleMap.update(map => { map.delete(this.id); return map })
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this._decodedAudio.set(buffer);
    this._encodedAudio.set(null);
  }

  private async _loadExisting() {
    this.loading._set(true);
    const [state, data] = await Promise.all([
      backend?.getSampleState(this.id),
      backend?.getSampleData(this.id),
    ]);
    if (!state) {
      this.error._set("Sample could not be loaded");
    } else if (!data) {
      this.error._set("Sample audio data could not be loaded");
    } else {
      data instanceof AudioBuffer
        ? this.setAudioBuffer(data)
        : this._encodedAudio.set(data);
      this.title.set(state.title ?? null);
    }
  }

  // Ensures we only create one player at a time and don't clog up
  // the main thread
  private static _playerCreateQueue = new PQueue({ concurrency: 1 });

  private _playerCreateAbort: AbortController | null = null;

  private async _createPlayer(
    [encoded, decoded]: [ArrayBuffer | null, AudioBuffer | null],
    set: (val: Player) => void
  ) {
    this._playerCreateAbort?.abort();
    if (encoded) {
      try {
        this._playerCreateAbort = new AbortController();
        const audio = await SampleStore._playerCreateQueue.add(
          () =>
            new Promise<HTMLAudioElement>((res) => {
              const audio = new Audio(URL.createObjectURL(new Blob([encoded])));
              audio.ondurationchange = () => this.duration._set(audio.duration);
              audio.onpause = () => this.playing._set(false);
              audio.oncanplaythrough = () => res(audio);
              this._playerCreateAbort.signal.addEventListener("abort", () => {
                audio.oncanplaythrough = undefined;
                audio.removeAttribute("src");
              });
            }),
          { signal: this._playerCreateAbort.signal }
        );
        this.loading._set(false);

        set({
          play: () => {
            audio.currentTime = 0;
            audio.play();
            this.playing._set(true);
          },
          stop: () => {
            audio.pause();
            audio.currentTime = 0;
          },
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          throw e;
        }
      }
    } else if (decoded) {
      let source: AudioBufferSourceNode;
      this.loading._set(false);
      this.duration._set(decoded.duration);
      set({
        play: () => {
          if (source) {
            source.onended = undefined;
            source.stop();
          }
          source = audioContext.createBufferSource();
          source.buffer = decoded;
          source.connect(audioContext.destination);
          source.onended = () => this.playing._set(false);
          this.playing._set(true);
          source.start();
        },
        stop: () => {
          this.playing._set(false);
          source?.stop();
        },
      });
    } else {
      this.loading._set(true);
      this.playing._set(false);
      set(null);
    }
  }

  private _decodePromise = null;
  private _setDecodedAudio(
    [encoded, decoded]: [ArrayBuffer | null, AudioBuffer | null],
    set: (val: AudioBuffer | null) => void
  ) {
    this._decodePromise?.cancel();
    if (decoded) {
      set(decoded);
    } else if (encoded) {
      this._decodePromise = this._decodeAudio(encoded);
      this._decodePromise
        .then((ab) => {
          this._decodedAudio.set(ab);
        })
        .catch((e) => {
          if (!(e instanceof CancelError)) {
            this.error._set("Unable to decode sample");
          }
        });
    } else {
      set(null);
    }
  }

  private readonly _decodeAudio = PCancelable.fn((arrayBuffer: ArrayBuffer) =>
    audioContext.decodeAudioData(arrayBuffer.slice(0))
  );

  private static readonly _sampleMap = writable(new Map<string, SampleStore>());

  public static anyPlaying = anyPlayingStore(this._sampleMap);

  private static _addToSampleMap(store: SampleStore) {
    this._sampleMap.update(map => map.set(store.id, store))
  }

  public static stopAll(): void {
    for (const { player } of get(this._sampleMap).values()) {
      get(player)?.stop();
    }
  }

  public static getSample(id: string): SampleStore {
    const map = get(SampleStore._sampleMap);
    let store = map.get(id);
    if (!store) {
      store = new SampleStore(id);
      store._loadExisting();
      this._addToSampleMap(store);
    }
    return store;
  }

  public static createNewSample(
    data: ArrayBuffer | Blob,
    title?: string
  ): SampleStore {
    const id = v4();
    const store = new SampleStore(id);
    store.title.set(title ?? null);
    (data instanceof Blob ? data.arrayBuffer() : Promise.resolve(data)).then(
      (buf) => {
        store._encodedAudio.set(buf);
      }
    );

    this._addToSampleMap(store);
    return store;
  }
}

function anyPlayingStore(sampleMapStore: Readable<Map<unknown, { playing: Readable<boolean> }>>): Readable<boolean> {
  const onSub = () => derived(sampleMapStore, map =>
    derived(Array.from(map.values(), s => s.playing) as any, (playingArray: boolean[]) => playingArray.includes(true))
  ).subscribe(playingStore => playingStore.subscribe(playing => ret._set(playing)))

  const ret = privateWritable(false, onSub);
  return ret;
}

export const anyPlaying = SampleStore.anyPlaying;
