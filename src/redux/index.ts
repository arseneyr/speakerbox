import {
  configureStore,
  getDefaultMiddleware,
  combineReducers,
} from "@reduxjs/toolkit";
import sources from "./sources";
import samples from "./samples";
import settings from "./settings";
import audioBuffers from "./audio_buffer";
import { persistReducer, persistStore } from "redux-persist";
import localforage from "localforage";
import { remoteSamplesReducer } from "./remote";

localforage.config({
  driver: localforage.INDEXEDDB,
});

const reducer = combineReducers({
  sources,
  samples: remoteSamplesReducer(samples),
  settings,
  audioBuffers,
});

const persistedReducer = persistReducer(
  {
    key: "root",
    version: 1,
    storage: localforage,
    whitelist: ["samples", "sources", "settings"],
    serialize: false,
    deserialize: false,
  } as any,
  reducer
);

const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware({
    /*serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },*/
    serializableCheck: false,
  }),
});
const persistor = persistStore(store as any);

export function getPersistor() {
  return persistor;
}

const remoteStore = configureStore({
  reducer: {
    samples,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof reducer>;
export type RemoteState = Pick<RootState, "samples">;

export { store, remoteStore };
