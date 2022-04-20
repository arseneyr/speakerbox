import { combineReducers, configureStore } from "@reduxjs/toolkit";
// import { remoteBackendReducer } from "./remoteBackend";
import { savedSampleReducer, tempSampleReducer } from "./sample";
import sampleData from "./sampleData";

const reducer = combineReducers({
  savedSamples: savedSampleReducer,
  tempSamples: tempSampleReducer,
  sampleData,
});

function createStore() {
  return configureStore({
    reducer,
  })
}

export type RootState = ReturnType<typeof reducer>;
export { createStore }
