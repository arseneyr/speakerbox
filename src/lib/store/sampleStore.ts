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

const mainStore = writable<MainSavedState | null>(null);

async function initialize(newBackend: StorageBackend): Promise<void> {
  backend = newBackend;
  let mainSavedState = await backend.getMainState();
  if (!mainSavedState) {
    mainSavedState = { version: VERSION, samples: [], settings: {} };
  }
  mainStore.set(mainSavedState);
}

const PLAYER_CREATE_QUEUE_DEPTH = 2;

class SampleStore {
  public readonly title = writable<string | null>(null);
  public readonly error = privateWritable<string | null>(null);
  public readonly id: string;

  private readonly _encodedAudio = writable<ArrayBuffer | null>(null);
  private readonly _decodedAudio = writable<AudioBuffer | null>(null);

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

  public constructor(
    data: ArrayBuffer | Blob | AudioBuffer,
    id?: string,
    title?: string
  ) {
    this.id = id ?? v4();
    this.title.set(title ?? null);

    if (data instanceof AudioBuffer) {
      this._decodedAudio.set(data);
    } else if (data instanceof Blob) {
      data.arrayBuffer().then((buf) => this._encodedAudio.set(buf));
    } else {
      this._encodedAudio.set(data);
    }
  }

  public destroy(): void {
    this.player._val?.destroy();
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this._decodedAudio.set(buffer);
    this._encodedAudio.set(null);
  }

  // Ensures we only create two players at a time and don't clog up
  // the main thread
  private static _playerCreateQueue = new PQueue({
    concurrency: PLAYER_CREATE_QUEUE_DEPTH,
  });

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
}

export { SampleStore };
