import { configureStore } from "@reduxjs/toolkit";
import { sampleReducer } from "@features/sample/sampleSlice";
import {
  audioSourceReducer,
  createAudioSource,
} from "@features/audioSource/audioSourceSlice";
import createSagaMiddleware from "redux-saga";
import { rootSaga } from "./saga";
import { persistReducer, startRehydrate } from "@features/persist/persistor";
import { recorderReducer } from "@features/recorder/recorderSlice";
import { listenerMiddleware } from "./listenerMiddleware";

export function createStore() {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: {
      samples: sampleReducer,
      audioSources: audioSourceReducer,
      persist: persistReducer,
      recorder: recorderReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [createAudioSource.type],
        },
      })
        .prepend(listenerMiddleware.middleware)
        .concat(sagaMiddleware),
  });

  sagaMiddleware.run(rootSaga);
  store.dispatch(startRehydrate());
  return store;
}

type Store = ReturnType<typeof createStore>;

export type RootState = ReturnType<Store["getState"]>;
export type AppDispatch = Store["dispatch"];
