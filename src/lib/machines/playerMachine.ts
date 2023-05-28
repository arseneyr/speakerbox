import {
  assign,
  createMachine,
  sendParent,
  type MachineContext,
  fromCallback,
} from "xstate";

export type PlayerEvents<TContext> =
  | { type: "READY"; data: Partial<TContext> }
  | { type: "PLAY" }
  | { type: "ENDED" }
  | { type: "STOP" }
  | { type: "ERROR" };

function createPlayerMachine<TContext extends MachineContext>() {
  return createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QAcA2BDAnmATgYgFEAlIgeSIG0AGAXURQHtYBLAF2YYDt6QAPRACwB2ADQhMggKwAOAHQBGSQDYATJIC+6sWiy5ZqBugjNOUPEQIBBACIBNanSQhkTNh25P+CNfNlCqAMzyamISCIoCshpazhjYOLKwrAzIyJB4AAoAMpb2tDwuLOxcPF4qSr5C0sGSoYhqVLICkkFqmtpxejqYJmYAygAqpBkOBa7FHqBlkpWBNXUIAQJKTVSq0R26Cd29hABy1gTWo06FbiWe9TN+cyHiiAEAnCuPa20x3V1xu9m5J4xFdylRDVWTSJRCeTSIS1e7eSSNAIqarvGKcBgQOAFTo4MaAi5TRAAWnkCyJSnasS2+kMxlMePOkz4iHkwRurVhYXkQiEfnKynem3iiWSqUgDImwIQAhUsw5CyCKwCAo2VOFO3pp3GQMu0tEcOVvmRNUpnwSuBwDFxWvxTOmcvmcOavIEb2imiAA */
      id: "player",
      types: {} as {
        typegen: import("./playerMachine.typegen").Typegen0;
        events: PlayerEvents<TContext>;
        context: TContext;
        // actors: { loadPlayer: { output: any } };
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
        onReady: assign(({ context, event }) => ({
          ...context,
          ...event.data,
        })),
        sendParent: sendParent(({ event }) => event),
      },
    }
  );
}

type AudioElementPlayerContext = {
  srcBlob: Blob;
  audioElement?: HTMLAudioElement;
};

const audioElementPlayerMachine =
  createPlayerMachine<AudioElementPlayerContext>().provide({
    actors: {
      loadPlayer: fromCallback((sendParent, _, { input }) => {
        const url = URL.createObjectURL(input.srcBlob);
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
      }),
    } as any,
    actions: {
      rewind: ({ context }) => {
        context.audioElement!.currentTime = 0;
      },
      stopPlaying: ({ context }) => context.audioElement!.pause(),
      startPlaying: ({ context }) => context.audioElement!.play(),
    },
  });

export { audioElementPlayerMachine };
