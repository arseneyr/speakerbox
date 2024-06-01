import { AbortError } from "/common/errors";
import { Deferred } from "/common/utils";

export interface Player {
  play(): Promise<void>;
  stop(): void;
  destroy(): void;
  duration: number;
}

export function createEncodedPlayer(
  blob: Blob,
  abort?: AbortSignal,
): Promise<Player> {
  if (abort?.aborted) {
    return Promise.reject(new AbortError());
  }

  return new Promise((resolve, reject) => {
    // const audio = new Audio(URL.createObjectURL(new Blob([buffer])));
    let stopDeferred: Deferred<void> | undefined;

    const audio = new Audio();
    audio.srcObject = blob;

    let removeFromAudioContext: (() => void) | undefined;
    function onAbort() {
      player.destroy();
      reject(new AbortError());
    }
    abort?.addEventListener("abort", onAbort);
    audio.onpause = () => stopDeferred?.resolve();
    const player = {
      play() {
        // getAudioContext().resume();
        audio.currentTime !== 0 && (audio.currentTime = 0);
        audio.play();
        stopDeferred = new Deferred();
        return stopDeferred.promise;
      },
      stop() {
        audio.pause();
        audio.currentTime = 0;
      },
      duration: 0,
      destroy() {
        this.stop();
        audio.src = "";
        removeFromAudioContext?.();
      },
    } satisfies Player;
    audio.ondurationchange = () => {
      player.duration = audio.duration;
    };

    function onCanPlayThrough() {
      abort?.removeEventListener("abort", onAbort);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      // removeFromAudioContext = addSourceToAudioContext(audio);
      resolve(player);
    }

    audio.addEventListener("canplaythrough", onCanPlayThrough);
    // window.players = window.players ?? [];
    // window.players.push(audio);
  });
}
