import { AbortError } from "@common/errors";

export interface Player {
  play(): Promise<void>;
  stop(): void;
  destroy(): void;
  durationMs: number;
}

export function createEncodedPlayer(
  blob: Blob,
  abort?: AbortSignal,
): Promise<Player> {
  return new Promise((resolve, reject) => {
    if (abort?.aborted) {
      return reject(new AbortError());
    }
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);

    let removeFromAudioContext: (() => void) | undefined;
    function onAbort() {
      player.destroy();
      reject(new AbortError());
    }
    abort?.addEventListener("abort", onAbort);
    const player = {
      play() {
        audio.currentTime !== 0 && (audio.currentTime = 0);
        audio.play();
        return new Promise<void>((resolve) => {
          audio.onpause = () => {
            resolve();
            audio.currentTime = 0;
          };
        });
      },
      stop() {
        audio.onpause = null;
        audio.pause();
        audio.currentTime = 0;
      },
      durationMs: 0,
      destroy() {
        this.stop();
        audio.src = "";
        removeFromAudioContext?.();
      },
    } satisfies Player;
    audio.ondurationchange = () => {
      player.durationMs = audio.duration;
    };

    function onCanPlayThrough() {
      abort?.removeEventListener("abort", onAbort);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      resolve(player);
    }

    audio.addEventListener("canplaythrough", onCanPlayThrough);
    // window.players = window.players ?? [];
    // window.players.push(audio);
  });
}
