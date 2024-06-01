import { privateWritable } from "$lib/utils";

async function createEncodedPlayer() {
  const playing = privateWritable(false);
  return {
    play() {
      playing._set(true);
    },
    stop() {
      playing._set(false);
    },
    playing,
    duration: 0,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    destroy() {},
  };
}

export { createEncodedPlayer };
