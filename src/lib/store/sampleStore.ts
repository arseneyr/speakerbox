import { derived, writable } from "svelte/store";
import { v4 } from "uuid";
import { privateWritable } from "$lib/utils";
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

const decodeAudio = PCancelable.fn((arrayBuffer: ArrayBuffer) =>
  getAudioContext().decodeAudioData(arrayBuffer.slice(0))
);

class SampleStore {
  public readonly title = writable<string | null>(null);
  public readonly error = privateWritable<string | null>(null);
  public readonly id: string;

  // private readonly _encodedAudio = writable<ArrayBuffer | null>(null);
  // private readonly _decodedAudio = writable<AudioBuffer | null>(null);
  private readonly _source = writable<{
    encoded: ArrayBuffer | null;
    decoded: AudioBuffer | null;
  }>({ encoded: null, decoded: null });

  public readonly player = derived(
    // [this._encodedAudio, this._decodedAudio],
    this._source,
    this._createPlayer.bind(this),
    null
  );

  public readonly audioBuffer = derived(
    this._source,
    this._setDecodedAudio.bind(this),
    null
  );

  public readonly saveSource = derived(this._source, ({ encoded, decoded }) =>
    encoded ? encoded : decoded
  );

  public constructor({ data, id, title }: SampleStoreOpts) {
    this.id = id ?? v4();
    this.title.set(title ?? null);

    if (data instanceof AudioBuffer) {
      this._source.set({ encoded: null, decoded: data });
    } else if (data instanceof Blob) {
      data
        .arrayBuffer()
        .then((buf) => this._source.set({ encoded: buf, decoded: null }));
    } else {
      this._source.set({ encoded: data, decoded: null });
    }
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this._source.set({ encoded: null, decoded: buffer });
  }

  // Ensures we only create two players at a time and don't clog up
  // the main thread
  private static _playerCreateQueue = new PQueue({
    concurrency: PLAYER_CREATE_QUEUE_DEPTH,
  });

  private _createPlayer(
    {
      encoded,
      decoded,
    }: { encoded: ArrayBuffer | null; decoded: AudioBuffer | null },
    set: (val: Player | null) => void
  ) {
    if (encoded) {
      const abort = new AbortController();
      let player: Player | null = null;
      SampleStore._playerCreateQueue
        .add(() => createEncodedPlayer(encoded, abort.signal), {
          signal: abort.signal,
        })
        .then((p) => {
          set(p);
          player = p;
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            throw e;
          }
        });
      return () => {
        abort.abort();
        player?.destroy();
      };
    } else if (decoded) {
      const player = createDecodedPlayer(decoded);
      set(player);
      return () => {
        player.destroy();
      };
    }
    set(null);
  }

  private _setDecodedAudio(
    {
      encoded,
      decoded,
    }: { encoded: ArrayBuffer | null; decoded: AudioBuffer | null },
    set: (val: AudioBuffer | null) => void
  ) {
    if (decoded) {
      set(decoded);
      return;
    }
    set(null);
    if (encoded) {
      const decodePromise = decodeAudio(encoded);
      decodePromise.then(set).catch((e) => {
        if (!(e instanceof CancelError)) {
          this.error._set("Unable to decode sample");
        }
      });

      return () => decodePromise.cancel();
    }
  }
}

export { SampleStore };
