import {
  assign,
  createMachine,
  type ActorRefFrom,
  spawn,
  forwardTo,
  sendTo,
} from "xstate";
import localState from "./localState";

const saveStateMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlgBd0AncgYggHtCSCA3BgazBLSz0NIVq5BGwaZ05XEwDaABgC68hYlAAHBrFxSmqkAA9EAFgDMJAExyTARnMBWADQgAnogBsADhJ2Avn6f4DBBwerw4BMR6Glo6+HqGCAC05uYeTq5J1gCc-iBh-MRklDRRmtrScUgGiInWHnLpiADsWSRZdjb2ufkRpAA2DOjBEKUxFfGI5kZGJCZZcm72jQjWViRGHba+fj5AA */
    tsTypes: {} as import("./saveState.typegen").Typegen0,
    schema: {
      context: {} as { localStateRef: ActorRefFrom<typeof localState> },
      events: {} as { type: "REHYDRATE" },
      services: {} as { loadLocalState: { data: object } },
    },
    initial: "start",
    states: {
      start: {
        invoke: {
          id: "loadLocalState",
          src: "loadLocalState",
          onDone: {
            actions: "sendLoadState",
          },
          onError: {
            actions: "sendLoadState",
          },
          target: "loaded",
        },
        onExit: "spawnLocalState",
      },

      loaded: {},
    },
  },
  {
    services: {
      loadLocalState: async () => ({}),
    },
    actions: {
      spawnLocalState: assign({ localStateRef: () => spawn(localState) }),
      sendLoadState: (context, event) =>
        sendTo(context.localStateRef, {
          type: "STATE_LOADED",
          data:
            event.type === "error.platform.loadLocalState" ? {} : event.data,
        }),
    },
  }
);

export default saveStateMachine;
