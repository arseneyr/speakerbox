import { assign, createMachine, sendParent } from "xstate";

export type PlayerEvents<TContext> =
  | { type: "READY"; data: Partial<TContext> }
  | { type: "PLAY" }
  | { type: "ENDED" }
  | { type: "STOP" }
  | { type: "ERROR" };

function createPlayerMachine<TContext>() {
  return createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnmATgYgFEAlIgeSIG0AGAXURQHtYBLAF2YYDt6QAPRACwB2ADQhMggKwAOAHQBGSQDYATJIC+6sWiy5ZqBugjNOUPEQIBBACIBNanSQhkTNh25P+CNfNlCqAMzyamISCIoCshpazhjYOLKwrAzIyJB4AAoAMpb2tDwuLOxcPF4qSr5C0sGSoYhqVLICkkFqmtpxejqYJmYAygAqpBkOBa7FHqBlkpWBNXUIAQJKTVSq0R26Cd29hABy1gTWo06FbiWe9TN+cyHiiAEAnCuPa20x3V1xu9m5J4xFdylRDVWTSJRCeTSIS1e7eSSNAIqarvGKcBgQOAFTo4MaAi5TRAAWnkCyJSnasS2+kMxlMePOkz4iHkwRurVhYXkQiEfnKynem3iiWSqUgDImwIQAhUsw5CyCKwCAo2VOFO3pp3GQMu0tEcOVvmRNUpnwSuBwDFxWvxTOmcvmcOavIEb2imiAA */
      id: "player",
      tsTypes: {} as import("./player.typegen").Typegen0,
      schema: {
        events: {} as PlayerEvents<TContext>,
        context: {} as TContext,
      },
      initial: "loading",
      invoke: { src: "loadPlayer" },
      on: {
        ERROR: { target: "error" },
      },
      states: {
        loading: {
          on: {
            READY: {
              actions: ["onReady", "sendParent"],
              target: "stopped",
            },
          },
        },
        stopped: {
          entry: "rewind",
          on: {
            PLAY: {
              actions: ["startPlaying", "sendParent"],
              target: "playing",
            },
          },
        },
        playing: {
          on: {
            STOP: "stopped",
            ENDED: "stopped",
            PLAY: { actions: "rewind" },
          },
          exit: "stopPlaying",
        },
        error: { type: "final" },
      },
    },
    {
      actions: {
        onReady: assign((context, event) => ({ ...context, ...event.data })),
        sendParent: sendParent((_, event) => event),
      },
    }
  );
}

type AudioElementPlayerContext = {
  srcBlob: Blob;
  audioElement?: HTMLAudioElement;
};

const audioElementPlayer =
  createPlayerMachine<AudioElementPlayerContext>().withConfig({
    services: {
      loadPlayer: (context) => (sendParent) => {
        const url = URL.createObjectURL(context.srcBlob);
        const audioElement = new Audio(url);
        URL.revokeObjectURL(url);

        audioElement.addEventListener("canplaythrough", () =>
          sendParent({ type: "READY", data: { audioElement } })
        );
        audioElement.addEventListener("error", () =>
          sendParent({ type: "ERROR" })
        );
        audioElement.addEventListener("ended", () =>
          sendParent({ type: "ENDED" })
        );
        return () => {
          audioElement.src = "";
        };
      },
    },
    actions: {
      rewind: (context) => {
        context.audioElement!.currentTime = 0;
      },
      stopPlaying: (context) => context.audioElement!.pause(),
      startPlaying: (context) => context.audioElement!.play(),
    },
  });

export { audioElementPlayer };
