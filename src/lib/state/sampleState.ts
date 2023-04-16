import { createMachine } from "xstate";

const sampleState = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwIYFsAOAbMBlALivmAHRYD2KEAlgHZQDEuAogCoD6uAggLIAKAGWbsAIl1ZcA2gAYAuolAZysavmrlaCkAA9EAWgBMAVgDMAGhABPfQBYDJIwF9nF2uQhwtqTDgJEwWkoqahpaugh6dtIW1hEAjAYAnC4g3th4hMRklDT0gcqq6ppIOvomAOwGMbYGKWm+maSw+OQYGJD5wUVhtuUOJglG1RF2zs5AA */
  id: "sampleState",

  tsTypes: {} as import("./sampleState.typegen").Typegen0,

  schema: {
    events: {} as { type: "SET_SOURCE_DATA" },
  },

  states: {
    loading: {
      on: {
        SET_SAMPLE_DATA: "stopped",
      },
    },

    stopped: {},
  },
});
