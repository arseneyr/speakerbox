import {
  Readable,
  readable,
  Unsubscriber,
  Writable,
  writable,
} from "svelte/store";
import { v4 } from "uuid";
import { persistantWritable, privateReadable, waitForValue } from "./utils";
import audioContext from "$lib/audioContext";

const VERSION = "1.0";

export interface StorageBackend {
  getMainState(): Promise<MainSavedState | null>;
  setMainState(state: MainSavedState): Promise<unknown>;

  getSampleState(id: string): Promise<SampleSavedState | null>;
  setSampleState(state: SampleSavedState): Promise<unknown>;

  getSampleData(id: string): Promise<ArrayBuffer | null>;
  setSampleData(id: string, data: ArrayBuffer): Promise<unknown>;
}

export interface MainSavedState {
  version: string;
  samples: string[];
}

export interface SampleSavedState {
  id: string;
  title?: string;
}

interface SampleState extends SampleSavedState {
  loading: boolean;
  paused: boolean;
  audioData?: ArrayBuffer;
  durationMs?: number;
  error?: string;
}

const mainStateWritable = (init: MainSavedState) =>
  persistantWritable(init, (v) => backend!.setMainState(v));

// type SampleStore = ReturnType<typeof createSampleStore>;

let backend: StorageBackend | null = null;

export async function initialize(
  newBackend: StorageBackend
): Promise<Writable<MainSavedState>> {
  backend = newBackend;
  let mainState = await backend.getMainState();
  if (!mainState) {
    mainState = { version: VERSION, samples: [] };
  }

  return mainStateWritable(mainState);
}

interface Player {
  play(): void;
  stop(): void;
}

export default class SampleStore {
  public title = writable<string | null>(null);
  public paused = writable(true);
  public readonly audioBuffer = privateReadable<AudioBuffer | null>(null);

  public loading = privateReadable(true);
  public error = privateReadable<string | null>(null);
  public player = privateReadable<Player | null>(null);
  public duration = privateReadable<number | null>(null);

  private _audioData = writable<ArrayBuffer | null>(null);
  private _destroyCbs: Unsubscriber[];

  private constructor(public readonly id: string) {
    this._destroyCbs = [
      this.title.subscribe((newTitle) =>
        backend?.setSampleState({ id, title: newTitle ?? undefined })
      ),
      this._audioData.subscribe((newData) => {
        // backend.setSampleData(id, newData)
        if (newData) {
          const audio = new Audio(URL.createObjectURL(new Blob([newData])));
          audio.ondurationchange = () => (this.duration.val = audio.duration);
          audio.onpause = () => this.paused.set(true);
          this.player.val = {
            play: () => {
              audio.currentTime = 0;
              audio.play();
            },
            stop: () => {
              audio.pause();
              audio.currentTime = 0;
            },
          };
        }
      }),
      this.audioBuffer.onSubscribe(() => {
        if (!this.audioBuffer.val) {
          waitForValue(this._audioData)
            .then((a) => audioContext.decodeAudioData(a))
            .then((ab) => (this.audioBuffer.val = ab));
        }
      }),
    ];
  }

  public destroy(): void {
    this._destroyCbs.forEach((stop) => stop());
    SampleStore._sampleMap.delete(this.id);
  }

  public setAudioBuffer(buffer: AudioBuffer) {
    this._audioData.set(null);
    this.audioBuffer.val = buffer;
    let source: AudioBufferSourceNode;
    this.player.val = {
      play: () => {
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
      },
      stop: () => {
        source?.stop();
      },
    };
  }

  private async _loadExisting() {
    this.loading.val = true;
    const [state, data] = await Promise.all([
      backend?.getSampleState(this.id),
      backend?.getSampleData(this.id),
    ]);
    this.loading.val = false;
    if (!state) {
      this.error.val = "Sample could not be loaded";
    } else if (!data) {
      this.error.val = "Sample audio data could not be loaded";
    } else {
      this._audioData.set(data);
    }
  }

  private static _sampleMap = new Map<string, SampleStore>();

  public static getSample(id: string): SampleStore {
    let store = SampleStore._sampleMap.get(id);
    if (!store) {
      store = new SampleStore(id);
      store._loadExisting();
      SampleStore._sampleMap.set(id, store);
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
        store.loading.val = false;
        store._audioData.set(buf);
      }
    );

    SampleStore._sampleMap.set(id, store);
    return store;
  }
}
