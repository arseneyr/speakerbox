import { combineReducers } from "@reduxjs/toolkit";
import { remoteBackendReducer } from "./remoteBackend";
import sampleReducer from "./sample";

const reducer = combineReducers({
  samples: sampleReducer,
  remoteBackend: remoteBackendReducer,
});

export type RootState = ReturnType<typeof reducer>;
