import { addSourceToAudioContext, getAudioContext } from "$lib/audioContext";
import { AbortError } from "$lib/types";
import type { Player } from "$lib/types";
import { privateWritable } from "$lib/utils";

// declare global {
//   interface Window {
//     players?: HTMLAudioElement[];
//   }
// }

function createEncodedPlayer(blob: Blob, abort?: AbortSignal): Promise<Player> {
  if (abort?.aborted) {
    return Promise.reject(new AbortError());
  }

  return new Promise((resolve, reject) => {
    // const audio = new Audio(URL.createObjectURL(new Blob([buffer])));
    const audio = new Audio();
    audio.srcObject = blob;
    let removeFromAudioContext: (() => void) | undefined;
    function onAbort() {
      audio.oncanplaythrough = null;
      audio.src = "";
      // audio.removeAttribute("src");
      reject(new AbortError());
    }
    abort?.addEventListener("abort", onAbort);
    const player = {
      play() {
        getAudioContext().resume();
        audio.currentTime !== 0 && (audio.currentTime = 0);
        audio.play();
        this.playing._set(true);
      },
      stop() {
        audio.pause();
        audio.currentTime = 0;
      },
      playing: privateWritable(false),
      duration: 0,
      destroy() {
        this.stop();
        audio.src = "";
        removeFromAudioContext?.();
      },
    };
    audio.ondurationchange = () => {
      player.duration = audio.duration;
    };
    audio.onpause = () => {
      player.playing._set(false);
      audio.currentTime = 0;
    };

    function onCanPlayThrough() {
      abort?.removeEventListener("abort", onAbort);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      removeFromAudioContext = addSourceToAudioContext(audio);
      resolve(player);
    }

    audio.addEventListener("canplaythrough", onCanPlayThrough);
    // window.players = window.players ?? [];
    // window.players.push(audio);
  });
}

function createDecodedPlayer(buffer: AudioBuffer): Player {
  let source: AudioBufferSourceNode | undefined;
  const playing = privateWritable(false);
  let removeFromAudioContext: (() => void) | undefined;
  return {
    play() {
      getAudioContext().resume();
      if (source) {
        source.onended = null;
        source.stop();
        removeFromAudioContext?.();
        removeFromAudioContext = undefined;
      }
      source = getAudioContext().createBufferSource();
      source.buffer = buffer;
      removeFromAudioContext = addSourceToAudioContext(source);
      // source.connect(getAudioContext().destination);
      source.onended = () => {
        playing._set(false);
        removeFromAudioContext?.();
        removeFromAudioContext = undefined;
      };
      playing._set(true);
      source.start();
    },
    stop() {
      playing._set(false);
      source?.stop();
    },
    duration: buffer.duration,
    playing,
    destroy() {
      this.stop();
      // source?.disconnect();
    },
  };
}
import { AbortError } from "./types";

export interface Player {
  play(): void;
  stop(): void;
  destroy(): void;
  playing: Readable<boolean>;
}

function abortSignalPromise(signal: AbortSignal): Promise<never> {
  if (signal.aborted) {
    return Promise.reject(new AbortError());
  }
  return new Promise((_, rej) => {
    signal.addEventListener("abort", () => rej(new AbortError()), {
      once: true,
    });
  });
}

function abortablePromise<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return p;
  }
  return Promise.race([p, abortSignalPromise(signal)]);
}

class AudioElementPlayer {
  protected audio = new Audio();
  static #readyEvent = "canplaythrough";
  #ready = new Deferred<void>();

  public playing = privateWritable<boolean>();

  protected constructor(protected readonly abort?: AbortSignal) {
    if (abort?.aborted) {
      throw new AbortError();
    }

    abort?.addEventListener("abort", this.#onAbort, { once: true });
    this.audio.addEventListener(AudioElementPlayer.#readyEvent, this.#onReady);
    this.audio.addEventListener("pause", this.#onPause);
  }

  #onAbort = () => {
    this.audio.removeEventListener(
      AudioElementPlayer.#readyEvent,
      this.#onReady
    );
    this.#ready.reject(new AbortError());
  };

  #onReady = () => {
    this.abort?.removeEventListener("abort", this.#onAbort);
    this.#ready.resolve();
  };

  #onPause = () => {
    this.playing._set(false);
    this.audio.currentTime = 0;
  };

  public destroy() {
    this.stop();
    this.audio.removeAttribute("src");
    this.audio.load();
  }

  public stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  public play() {
    this.audio.currentTime !== 0 && (this.audio.currentTime = 0);
    this.audio.play();
    this.playing._set(true);
  }

  public setSink(sinkId: string): Promise<undefined> {
    return this.audio.setSinkId(sinkId);
  }

  protected async ready(): Promise<typeof this> {
    await this.#ready.promise;
    return this;
  }

  public static createAudioPlayer(
    url: string,
    abort?: AbortSignal
  ): Promise<AudioElementPlayer> {
    const player = new AudioElementPlayer(abort);
    player.audio.src = url;
    return player.ready();
  }
}

class MSEPlayer extends AudioElementPlayer {
  #source = new MediaSource();

  #sourceBuffer!: SourceBuffer;
  #sourceBufferReady: Promise<void>;
  #remainingDataFetched = false;

  private constructor(
    private readonly initialData: ArrayBuffer,
    private readonly getRemainingData?: () =>
      | Promise<ArrayBuffer>
      | ArrayBuffer,
    abort?: AbortSignal,
    private readonly mimeType = "audio/webm;codecs=opus"
  ) {
    super(abort);
    const url = URL.createObjectURL(this.#source);
    this.audio.src = url;
    this.#remainingDataFetched = !getRemainingData;
    this.#sourceBufferReady = this.#createSourceBuffer()
      .finally(() => URL.revokeObjectURL(url))
      .then(this.#onSourceBufferReady);
  }

  async #endStream(): Promise<void> {
    if (this.#sourceBuffer.updating === false) {
      this.#source.endOfStream();
    } else {
      await new Promise<void>((res) =>
        this.#sourceBuffer.addEventListener(
          "updateend",
          () => {
            this.#source.endOfStream();
            res();
          },
          {
            once: true,
          }
        )
      );
    }
  }

  #onSourceBufferReady = (srcBuffer: SourceBuffer) => {
    srcBuffer.appendBuffer(this.initialData);
    this.#sourceBuffer = srcBuffer;
    if (!this.getRemainingData) {
      return this.#endStream();
    }
  };

  async #createSourceBuffer(): Promise<SourceBuffer> {
    if (this.#source.readyState === "open") {
      return this.#source.addSourceBuffer(this.mimeType);
    }
    return abortablePromise(
      new Promise((res) => {
        this.#source.addEventListener(
          "sourceopen",
          () => res(this.#source.addSourceBuffer(this.mimeType)),
          { once: true }
        );
      }),
      this.abort
    );
  }

  protected async ready(): Promise<typeof this> {
    await this.#sourceBufferReady;
    await super.ready();
    return this;
  }

  public play() {
    if (!this.#remainingDataFetched && this.getRemainingData) {
      Promise.resolve(this.getRemainingData()).then((data) => {
        this.#sourceBuffer.appendBuffer(data);
        return this.#endStream();
      });
      this.#remainingDataFetched = true;
    }
    super.play();
  }

  public static createMSEPlayer(
    initialData: ArrayBuffer,
    getRemainingData?: () => Promise<ArrayBuffer> | ArrayBuffer,
    abort?: AbortSignal
  ): Promise<Player> {
    const wrapper = new MSEPlayer(initialData, getRemainingData, abort);
    return wrapper.ready();
  }
}

export const createMSEPlayer = MSEPlayer.createMSEPlayer;
export const createURLPlayer = AudioElementPlayer.createAudioPlayer;


export { createEncodedPlayer, createDecodedPlayer };
