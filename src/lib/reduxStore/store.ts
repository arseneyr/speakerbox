import { combineReducers, configureStore } from "@reduxjs/toolkit";
import samples from "./sample";
import sampleData from "./sampleData";

const reducer = combineReducers({
  // savedSamples: savedSampleReducer,
  // tempSamples: tempSampleReducer,
  // sampleData,
  samples,
});

function createStore() {
  return configureStore({
    reducer,
  });
}

export type RootState = ReturnType<typeof reducer>;
export { createStore };
