// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
    "xstate.stop": { type: "xstate.stop" };
  };
  invokeSrcNameMap: {
    loadPlayer: "done.invoke.player:invocation[0]";
  };
  missingImplementations: {
    actions: "rewind" | "startPlaying" | "stopPlaying";
    delays: never;
    guards: never;
    services: "loadPlayer";
  };
  eventsCausingActions: {
    onReady: "READY";
    rewind: "ENDED" | "PLAY" | "READY" | "STOP";
    startPlaying: "PLAY";
    stopPlaying: "ENDED" | "ERROR" | "STOP" | "xstate.stop";
  };
  eventsCausingDelays: {};
  eventsCausingGuards: {};
  eventsCausingServices: {
    loadPlayer: "ERROR" | "xstate.init";
  };
  matchesStates: "error" | "loading" | "playing" | "stopped";
  tags: never;
}
