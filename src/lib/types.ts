import type { Readable } from "svelte/store";

export interface Player {
  play(): void;
  stop(): void;
  playing: Readable<boolean>;
  duration: number;
}

export class AbortError extends Error {
  constructor() {
    super();
    this.name = "AbortError";
  }
}
