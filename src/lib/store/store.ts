import {
  derived,
  Readable,
  Unsubscriber,
  Writable,
  writable,
} from "svelte/store";
import { v4 } from "uuid";
import { persistantWritable, privateReadable, privateWritable } from "./utils";
import audioContext from "$lib/audioContext";
import PCancelable, { CancelError } from "p-cancelable";

const VERSION = "1.0";

export interface StorageBackend {
  getMainState(): Promise<MainSavedState | null>;
  setMainState(state: MainSavedState): Promise<unknown>;

  getSampleState(id: string): Promise<SampleSavedState | null>;
  setSampleState(state: SampleSavedState): Promise<unknown>;

  getSampleData(id: string): Promise<ArrayBuffer | AudioBuffer | null>;
  setSampleData(id: string, data: ArrayBuffer | AudioBuffer): Promise<unknown>;
}

export interface MainSavedState {
  version: string;
  samples: string[];
}

export interface SampleSavedState {
  id: string;
  title?: string;
}

const mainStateWritable = (init: MainSavedState) =>
  persistantWritable(init, (v) => backend.setMainState(v));

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
    this._destroyCbs = [
      this.title.subscribe((newTitle) =>
        backend?.setSampleState({ id, title: newTitle ?? undefined })
      ),
    ];
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
  }

  public destroy(): void {
    this._destroyCbs.forEach((stop) => stop());
    SampleStore._sampleMap.delete(this.id);
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

  private _createPlayer([encoded, decoded]: [
    ArrayBuffer | null,
    AudioBuffer | null
  ]) {
    if (encoded) {
      const audio = new Audio(URL.createObjectURL(new Blob([encoded])));
      audio.ondurationchange = () => this.duration._set(audio.duration);
      audio.oncanplaythrough = () => this.loading._set(false);
      audio.onpause = () => this.playing._set(false);
      return {
        play: () => {
          audio.currentTime = 0;
          audio.play();
          this.playing._set(true);
        },
        stop: () => {
          audio.pause();
          audio.currentTime = 0;
        },
      };
    } else if (decoded) {
      let source: AudioBufferSourceNode;
      this.loading._set(false);
      return {
        play: () => {
          source = audioContext.createBufferSource();
          source.buffer = decoded;
          source.connect(audioContext.destination);
          source.onended = () => this.playing._set(false);
          this.playing._set(true);
          source.start();
        },
        stop: () => {
          source?.stop();
        },
      };
    }
    this.loading._set(true);
    this.playing._set(false);
    return null;
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
    audioContext.decodeAudioData(arrayBuffer)
  );

  private static readonly _sampleMap = new Map<string, SampleStore>();

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
        store._encodedAudio.set(buf);
      }
    );

    SampleStore._sampleMap.set(id, store);
    return store;
  }
}
