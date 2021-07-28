import type { Observable } from "rxjs";
import type { Readable } from "svelte/store";

type StoreOrObservable<T> = Readable<T> | Observable<T>;

export interface IPlayer {
  play(): void;
  stop(): void;
  playing: Observable<boolean>;
  duration: number;
}

export interface ISampleStore {
  title: StoreOrObservable<string | null>;
  player: StoreOrObservable<IPlayer | null>;
  audioBuffer: StoreOrObservable<AudioBuffer | null>;

  setDecodedAudio(buffer: AudioBuffer): void;
  setTitle(title: string): void;
}
