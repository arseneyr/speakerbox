import {
  assign,
  createMachine,
  type ActorRefFrom,
  spawn,
  sendTo,
} from "xstate";
import localState from "./localState";

const saveStateMachineId = "saveStateMachine";

const saveStateMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlgBd0AncgYggHtCSCA3BgazBIBsH0IAGQaZ0PAMqVyYANoAGALqJQABwaxc5XE2UgAHogCMhgEwkAHCfOG5AFnsBWWwE4AbAGZXAGhABPIwDstiS2Du6m7iYmDjEOAQEAvgk+aFh4hKQU1HRgVFQMVCQqPOjkAGYFqLz8QiJikqWyirpqGlo6SPpGhu4hzv3OhgGRcXHmPv4I1n0DARFycu7miUk++AwQcLqpOATELeqa2vi6BggAtIYTiOeuqyA76cRklDQHbceniLYB1wgmATMtjkrhMQwcIKiJnc7nujz2pD4Akg7yOHVAZ0MtnMJGcYOWAUG8WG7lsf2BvWckLBtlczlJhg8SSSQA */
    tsTypes: {} as import("./saveState.typegen").Typegen0,
    schema: {
      context: {} as { localStateRef: ActorRefFrom<typeof localState> },
      events: {} as
        | { type: "REHYDRATE" }
        | { type: "GET_PRELOAD"; data: { dataId: string; reply: string } },
      services: {} as { loadLocalState: { data: object } },
    },
    id: saveStateMachineId,
    initial: "start",
    states: {
      start: {
        invoke: {
          id: "loadLocalState",
          src: "loadLocalState",
          onDone: {
            actions: "sendLoadState",
            target: "loaded",
          },
          onError: {
            actions: "sendLoadState",
            target: "loaded",
          },
        },
        entry: "spawnLocalStateMachine",
      },

      loaded: {},
    },
  },
  {
    services: {
      loadLocalState: async () => ({}),
    },
    actions: {
      spawnLocalStateMachine: assign({
        localStateRef: () => spawn(localState),
      }),
      sendLoadState: (context, event) =>
        sendTo(context.localStateRef, {
          type: "LOAD_STATE",
          data:
            event.type === "error.platform.loadLocalState"
              ? { samples: [] }
              : event.data,
        }),
    },
  }
);

export default saveStateMachine;
export { saveStateMachineId };
