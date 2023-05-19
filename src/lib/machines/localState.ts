import {
  assign,
  createMachine,
  actions,
  sendParent,
  type ActorRefFrom,
  type Actor,
  spawn,
} from "xstate";
import { sampleMachine } from "./sampleMachine";

const { pure } = actions;

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
}

type LoadStateEvent = { type: "LOAD_STATE"; data: SaveState };

function isValidSaveState(state: unknown): state is SaveState {
  return (
    typeof state === "object" &&
    !!state &&
    "version" in state &&
    state?.version === 1
  );
}

const localState = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QBsD2BjAhsgygF0zzAFlN0ALASwDswA6WAgJzwGIcAVAQQ4FEB9ADIB5LgBFeYgNoAGALqJQAB1SxKeSqmqKQAD0QBGAGwGANCACehgOzW6AFgCsAZhkBOe-YAcAJns+DLy8AX2DzNCxcAiJSChp6RkwWdm4+IVEJaQMFJBAVNQ0tHX0EYzNLRC8DOkdQsJBqVAg4HQjsfEISMipaHXz1TW1ckoBaI3MrBDHQ8Ix26K642gZmPD7VAaLhxH8JwwNqg3tnAOc3GWsvWyMZkDaoztie+jRMZoh1gsHinccfGvsRiujj2pQOdDc1iMjns1j8BgC7nsdWCQA */
    id: "localStateMachine",
    tsTypes: {} as import("./localState.typegen").Typegen0,
    schema: {
      context: {} as LocalStateContext,
      events: {} as LoadStateEvent,
    },
    context: { samples: new Map(), sampleIds: [] },
    initial: "loading",
    states: {
      loading: {
        on: {
          LOAD_STATE: {
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
        sampleIds: (_, event) => event.data.samples.map((s) => s.id),
        samples: (_, event) =>
          new Map(
            event.data.samples.map((s) => [
              s.id,
              {
                ref: spawn(
                  sampleMachine.withContext({
                    id: s.id,
                    title: s.title,
                    dataId: s.dataId,
                  }),
                  s.id
                ),
              },
            ])
          ),
      }),
    },
  }
);

export default localState;
