import {
  configureStore,
  getDefaultMiddleware,
  combineReducers,
} from "@reduxjs/toolkit";
import sources from "./sources";
import samples, { samplePersistTransform } from "./samples";
import { persistReducer, persistStore, createTransform } from "redux-persist";
import localforage from "localforage";

localforage.config({
  driver: localforage.INDEXEDDB,
});

const transform = createTransform(samplePersistTransform, (s) => s, {
  whitelist: ["samples"],
});

const reducer = combineReducers({
  sources,
  samples,
});

const persistedReducer = persistReducer(
  {
    key: "root",
    version: 1,
    storage: localforage,
    whitelist: ["samples", "sources"],
    serialize: false,
    deserialize: false,
    transforms: [transform],
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
persistStore(store as any);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof reducer>;

export { store };
