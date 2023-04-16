import { assign, createMachine } from "xstate";

interface Sample {
  id: string;
}

interface LocalStateContext {
  version: 1;
  samples: Sample[];
}

type StateLoadedEvent = { type: "STATE_LOADED"; data: object | null };

function isValidSaveState(state: unknown): state is LocalStateContext {
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
      events: {} as StateLoadedEvent,
    },
    context: { version: 1, samples: [] },
    initial: "start",
    states: {
      start: {
        on: {
          STATE_LOADED: [
            {
              cond: (context, event) => !isValidSaveState(event.data),
              target: "loaded",
            },
            {
              target: "loaded",
              actions: "loadLocalState",
            },
          ],
        },
      },

      loaded: {},
    },
  },
  {
    actions: {
      loadLocalState: assign(
        (context, event) => event.data as LocalStateContext
      ),
    },
  }
);

export default localState;
