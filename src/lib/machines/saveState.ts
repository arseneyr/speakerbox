import { createMachine, fromPromise, sendParent } from "xstate";

const saveStateMachineId = "saveStateMachine";

interface SavedSample {
  id: string;
  dataId: string;
  title: string;
}

interface SaveState {
  version: string;
  samples: SavedSample[];
}

function isValidSaveState(state: unknown): state is SaveState {
  return (
    typeof state === "object" &&
    !!state &&
    "version" in state &&
    state?.version === 1
  );
}

const saveStateMachine = createMachine(
  {
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

      loaded: {
        on: {
          SAMPLE_DATA_LOAD: {},
        },
      },
    },
  },
  {
    actors: {
      loadLocalState: fromPromise(async () => ({})),
    },
    actions: {
      sendLoadState: ({ event }) =>
        sendParent({
          type: "STATE_LOADED",
          data:
            event.type === "done.invoke.loadLocalState"
              ? event.data
              : { samples: [] },
        }),
    },
  }
);

export default saveStateMachine;
export { saveStateMachineId };
