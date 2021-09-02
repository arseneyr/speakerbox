import { derived, Readable, Unsubscriber, writable } from "svelte/store";
import { v4 } from "uuid";
import { privateWritable, spyOnStore } from "$lib/utils";
import { getAudioContext } from "$lib/audioContext";
import PCancelable, { CancelError } from "p-cancelable";
import PQueue from "p-queue";
import type { MainSavedState, Player, StorageBackend } from "$lib/types";
import { createDecodedPlayer, createEncodedPlayer } from "./player";

const VERSION = "1.0";

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

class SampleStore {
  public readonly title = writable<string | null>(null);
  public readonly error = privateWritable<string | null>(null);

  private readonly _encodedAudio = writable<ArrayBuffer | null>(null);
  private readonly _decodedAudio = writable<AudioBuffer | null>(null);
  private readonly _destroyCbs: Unsubscriber[] = [];

  public readonly player = spyOnStore<Player | null, Readable<Player | null>>(
    null,
    derived(
      [this._encodedAudio, this._decodedAudio],
      this._createPlayer.bind(this),
      null
    )
  );

  public readonly audioBuffer = derived(
    [this._encodedAudio, this._decodedAudio],
    this._setDecodedAudio.bind(this),
    null
  );

  private constructor(public readonly id: string) {
    this._destroyCbs = [
      this.title.subscribe((newTitle) =>
        backend?.setSampleState({ id, title: newTitle ?? undefined })
      ),
    ];
  }

  public destroy(): void {
    this.player._val?.destroy();
    this._destroyCbs.forEach((stop) => stop());
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this._decodedAudio.set(buffer);
    this._encodedAudio.set(null);
  }

  private async _loadExisting() {
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
  private static _playerCreateQueue = new PQueue({ concurrency: 2 });

  private _playerCreateAbort: AbortController | null = null;

  private async _createPlayer(
    [encoded, decoded]: [ArrayBuffer | null, AudioBuffer | null],
    set: (val: Player) => void
  ) {
    this._playerCreateAbort?.abort();
    this._playerCreateAbort = null;
    if (encoded) {
      try {
        this._playerCreateAbort = new AbortController();
        const player = await SampleStore._playerCreateQueue.add(
          () => createEncodedPlayer(encoded, this._playerCreateAbort.signal),
          { signal: this._playerCreateAbort.signal }
        );
        set(player);
      } catch (e) {
        if (e.name !== "AbortError") {
          throw e;
        }
      }
    } else if (decoded) {
      set(createDecodedPlayer(decoded));
    } else {
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
    getAudioContext().decodeAudioData(arrayBuffer.slice(0))
  );

  public static createNewSample(
    data: ArrayBuffer | Blob | AudioBuffer,
    title?: string
  ): SampleStore {
    const id = v4();
    const store = new SampleStore(id);
    store.title.set(title ?? null);
    if (data instanceof AudioBuffer) {
      store._decodedAudio.set(data);
    } else if (data instanceof Blob) {
      data.arrayBuffer().then((buf) => store._encodedAudio.set(buf));
    } else {
      store._encodedAudio.set(data);
    }

    return store;
  }
}

export { SampleStore };
