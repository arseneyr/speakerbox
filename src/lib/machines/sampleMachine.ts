import {
  createMachine,
  type ActorRefFrom,
  spawn,
  assign,
  forwardTo,
} from "xstate";
import { audioElementPlayer, type PlayerEvents } from "./player";

const sampleState = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5SwIYFsAOAbMBlALivmAHRYD2KEAlgHZQDEuAogCoD6uAggLIAKAGWbsAIl1ZcA2gAYAuolAZysavmrlaCkAA9EAWgBMAVgDMAGhABPfQBYDJIwF9nF2uQhwtqTDgJEwWkoqahpaugh6dtIW1hEAjAYAnC4g3th4hMRklDT0gcqq6ppIOvomAOwGMbYGKWm+maSw+OQYGJD5wUVhtuUOJglG1RF2zs5AA */
    id: "sampleState",

    tsTypes: {} as import("./sampleMachine.typegen").Typegen0,

    schema: {
      context: {} as { playerRef?: ActorRefFrom<typeof audioElementPlayer> },
      events: {} as
        | { type: "SET_BLOB_SOURCE"; data: Blob }
        | PlayerEvents<unknown>,
    },
    initial: "start",

    states: {
      start: {
        on: {
          SET_BLOB_SOURCE: {
            target: "loading",
            actions: "createBlobPlayer",
          },
        },
      },
      loading: {
        on: {
          READY: "stopped",
        },
      },

      stopped: {
        on: {
          PLAY: { actions: "forwardToPlayer", target: "playing" },
        },
      },
      playing: {
        on: {
          ENDED: "stopped",
          STOP: { target: "stopped", actions: "forwardToPlayer" },
          PLAY: {
            actions: "forwardToPlayer",
          },
        },
      },
    },
  },
  {
    actions: {
      createBlobPlayer: assign({
        playerRef: (_, event) =>
          spawn(audioElementPlayer.withContext({ srcBlob: event.data })),
      }),
      forwardToPlayer: forwardTo((context) => context.playerRef!),
    },
  }
);
