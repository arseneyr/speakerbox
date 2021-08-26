import { getAudioContext } from "$lib/audioContext";
import { AbortError, Player } from "$lib/types";
import { privateWritable } from "$lib/utils";

export function createEncodedPlayer(
  buffer: ArrayBuffer,
  abort?: AbortSignal
): Promise<Player> {
  if (abort?.aborted) {
    return Promise.reject(new AbortError());
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(URL.createObjectURL(new Blob([buffer])));
    function onAbort() {
      audio.oncanplaythrough = undefined;
      audio.src = "";
      // audio.removeAttribute("src");
      reject(new AbortError());
    }
    abort?.addEventListener("abort", onAbort);
    const player = {
      play() {
        audio.currentTime = 0;
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
      },
    };
    audio.ondurationchange = () => {
      player.duration = audio.duration;
    };
    audio.onpause = () => player.playing._set(false);
    audio.oncanplaythrough = () => {
      abort?.removeEventListener("abort", onAbort);
      resolve(player);
    };
  });
}

export function createDecodedPlayer(buffer: AudioBuffer): Player {
  let source: AudioBufferSourceNode;
  return {
    play() {
      if (source) {
        source.onended = null;
        source.stop();
      }
      source = getAudioContext().createBufferSource();
      source.buffer = buffer;
      source.connect(getAudioContext().destination);
      source.onended = () => this.playing._set(false);
      this.playing._set(true);
      source.start();
    },
    stop() {
      this.playing._set(false);
      source?.stop();
    },
    duration: buffer.duration,
    playing: privateWritable(false),
    destroy() {
      this.stop();
      source.disconnect();
    },
  };
}
