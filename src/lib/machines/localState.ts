import { assign, createMachine, type ActorRefFrom } from "xstate";
import { sampleMachine } from "./sampleMachine";
import saveStateMachine, { saveStateMachineId } from "./saveState";

interface SavedSample {
  id: string;
  dataId: string;
  title: string;
}

interface SaveState {
  samples: SavedSample[];
}

interface Sample {
  ref: ActorRefFrom<typeof sampleMachine>;
}

interface LocalStateContext {
  sampleIds: string[];
  samples: Map<string, Sample>;
  saveStateRef?: ActorRefFrom<typeof saveStateMachine>;
}

type LoadStateEvent = { type: "STATE_LOADED"; data: SaveState };

const localState = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBsD2BjAhsgygF0zzAFlN0ALASwDswA6WAgJzwGIcAVAQQ4FEB9ADIB5LgBFeYgNoAGALqJQAB1SxKeSqmqKQAD0QBGAGwGANCACehgOzW6AFgCsAZhkBOe-YAcAJns+DLy8AX2DzNCxcAiJSChp6RkwWdm4+IVEJaQMFJBAVNQ0tHX0EYzNLRC8DOkdQsJBqVAg4HQjsfEISMipaHXz1TW1ckoBaI3MrBDHQ8Ix26K642gZmPD7VAaLhxH8JwwNqg3tnAOc3GWsvWyMZkDaoztie+jRMZoh1gsHinccfGvsRiujj2pQOdDc1iMjns1j8BgC7nsdWCQA */
    id: "localStateMachine",
    types: {} as {
      typegen: import("./localState.typegen").Typegen0;
      context: LocalStateContext;
      events: LoadStateEvent;
    },
    context: { samples: new Map(), sampleIds: [] },
    initial: "loading",
    invoke: {
      src: saveStateMachine,
      id: saveStateMachineId,
    },
    states: {
      loading: {
        on: {
          STATE_LOADED: {
            target: "loaded",
            actions: "loadSaveState",
          },
        },
      },

      loaded: {},
    },
  },
  {
    actions: {
      loadSaveState: assign({
        sampleIds: ({ event }) => event.data.samples.map((s) => s.id),
        samples: ({ event, spawn }) =>
          new Map(
            event.data.samples.map((s) => [
              s.id,
              {
                ref: spawn(sampleMachine, {
                  input: {
                    id: s.id,
                    title: s.title,
                    dataId: s.dataId,
                  },
                  id: s.id,
                }),
              },
            ])
          ),
      }),
    },
  }
);

export default localState;
