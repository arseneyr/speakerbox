import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
} from "@reduxjs/toolkit";
import remoteBackendReducer, { syncMiddleware } from "./remoteBackend";
import sampleReducer from "./sample";

const reducer = combineReducers({
  samples: sampleReducer,
  remoteBackend: remoteBackendReducer,
});

function createStore() {
  return configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(createListenerMiddleware().middleware)
        .concat(syncMiddleware),
  });
}

export type RootState = ReturnType<typeof reducer>;
export type AppDispatch = ReturnType<typeof createStore>["dispatch"];
export type AppThunkAction<R, State = RootState> = (
  dispatch: AppDispatch,
  getState: () => RootState
) => R;
