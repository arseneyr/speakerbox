import { derived, Readable, writable } from "svelte/store";
import { v4 } from "uuid";
import { assert, privateWritable } from "$lib/utils";
import { getAudioContext } from "$lib/audioContext";
import PCancelable, { CancelError } from "p-cancelable";
import PQueue from "p-queue";
import { createDecodedPlayer, createEncodedPlayer } from "./player";
import type { Player } from "$lib/types";

const PLAYER_CREATE_QUEUE_DEPTH = 2;

interface SampleStoreOpts {
  readonly data: ArrayBuffer | Blob | AudioBuffer;
  readonly id?: string;
  readonly title?: string;
}

class SampleStore {
  public readonly title = writable<string | null>(null);
  public readonly error = privateWritable<string | null>(null);
  public readonly id: string;

  private readonly _encodedAudio = writable<ArrayBuffer | null>(null);
  private readonly _decodedAudio = writable<AudioBuffer | null>(null);

  public readonly player = derived<
    [Readable<ArrayBuffer | null>, Readable<AudioBuffer | null>],
    Player | null
  >(
    [this._encodedAudio, this._decodedAudio],
    (...args) => {
      this._createPlayer(...args);
    },
    null
  );

  public readonly audioBuffer = derived(
    [this._encodedAudio, this._decodedAudio],
    this._setDecodedAudio.bind(this),
    null
  );

  public constructor({ data, id, title }: SampleStoreOpts) {
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

  // public destroy(): void {}

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
    set: (val: Player | null) => void
  ) {
    this._playerCreateAbort?.abort();
    this._playerCreateAbort = null;
    let player: Player | null = null;
    if (encoded) {
      try {
        this._playerCreateAbort = new AbortController();
        player = await SampleStore._playerCreateQueue.add(
          () => (
            assert(this._playerCreateAbort?.signal, "abort signal is null"),
            createEncodedPlayer(encoded, this._playerCreateAbort.signal)
          ),
          { signal: this._playerCreateAbort.signal }
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          throw e;
        }
      }
    } else if (decoded) {
      player = createDecodedPlayer(decoded);
    }
    set(player);
    if (player) {
      return player.destroy.bind(player);
    }
  }

  private _decodePromise: PCancelable<AudioBuffer> | null = null;
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
