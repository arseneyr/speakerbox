import { configureStore } from "@reduxjs/toolkit";
import sampleReducer from "@features/sample/sampleSlice";
import audioSourceReducer, {
  createAudioSource,
} from "@features/audioSource/audioSourceSlice";
import createSagaMiddleware from "redux-saga";
import { rootSaga } from "./saga";

export function createStore() {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: {
      samples: sampleReducer,
      audioSources: audioSourceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: { ignoredActions: [createAudioSource.type] },
      }).concat(sagaMiddleware),
  });

  sagaMiddleware.run(rootSaga);
  return store;
}

type Store = ReturnType<typeof createStore>;

export type RootState = ReturnType<Store["getState"]>;
export type AppDispatch = Store["dispatch"];
