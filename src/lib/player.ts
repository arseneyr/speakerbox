import type { Readable } from "svelte/store";
import { AbortError } from "./types";
import { Deferred, privateWritable } from "./utils";

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

  constructor(protected readonly abort?: AbortSignal) {
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

  protected async ready(): Promise<typeof this> {
    await this.#ready.promise;
    return this;
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

  public static create(
    initialData: ArrayBuffer,
    getRemainingData?: () => Promise<ArrayBuffer> | ArrayBuffer,
    abort?: AbortSignal
  ): Promise<Player> {
    const wrapper = new MSEPlayer(initialData, getRemainingData, abort);
    return wrapper.ready();
  }
}

export const createMSEPlayer = MSEPlayer.create;
