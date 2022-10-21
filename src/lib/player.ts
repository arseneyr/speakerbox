import type { Readable } from "svelte/store";
import { privateWritable } from "./utils";

export interface Player {
  play(): void;
  stop(): void;
  destroy(): void;
  playing: Readable<boolean>;
  duration: number;
}

async function createFilePlayer(file: File): Promise<Player> {
  const source = new MediaSource();
  const audio = new Audio(URL.createObjectURL(source));

  try {
    const [sourceBuffer, arrayBuffer] = await Promise.all([
      new Promise<SourceBuffer>((res) => {
        source.addEventListener("sourceopen", () => {
          res(source.addSourceBuffer(file.type));
        });
      }),
      file.arrayBuffer(),
    ]);
    sourceBuffer.appendBuffer(arrayBuffer);
    source.endOfStream();
  } finally {
    URL.revokeObjectURL(audio.src);
  }
  return new Promise((resolve, reject) => {
    // const audio = new Audio(URL.createObjectURL(new Blob([buffer])));
    // const audio = new Audio();
    // audio.srcObject = blob;
    // let removeFromAudioContext: (() => void) | undefined;
    // function onAbort() {
    //   audio.oncanplaythrough = null;
    //   player.destroy();
    //   reject(new AbortError());
    // }
    // abort?.addEventListener("abort", onAbort);
    const player = {
      play() {
        // getAudioContext().resume();
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
        // audio.src = "";
        audio.removeAttribute("src");
        audio.load();
        // removeFromAudioContext?.();
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
      // abort?.removeEventListener("abort", onAbort);
      // audio.removeEventListener("canplaythrough", onCanPlayThrough);
      // removeFromAudioContext = addSourceToAudioContext(audio);
      resolve(player);
    }

    audio.addEventListener("canplaythrough", onCanPlayThrough);
    // window.players = window.players ?? [];
    // window.players.push(audio);
  });
}

export { createFilePlayer };
