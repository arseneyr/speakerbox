// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "done.invoke.loadLocalState": {
      type: "done.invoke.loadLocalState";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.loadLocalState": {
      type: "error.platform.loadLocalState";
      data: unknown;
    };
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {
    loadLocalState: "done.invoke.loadLocalState";
  };
  missingImplementations: {
    actions: never;
    delays: never;
    guards: never;
    services: never;
  };
  eventsCausingActions: {
    sendLoadState:
      | "done.invoke.loadLocalState"
      | "error.platform.loadLocalState";
    spawnLocalState: "xstate.stop";
  };
  eventsCausingDelays: {};
  eventsCausingGuards: {};
  eventsCausingServices: {
    loadLocalState: "xstate.init";
  };
  matchesStates: "loaded" | "start";
  tags: never;
}
