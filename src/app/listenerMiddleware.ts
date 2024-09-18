import {
  AnyListenerPredicate,
  createListenerMiddleware,
  ForkedTask,
  ForkedTaskExecutor,
  ListenerEffectAPI,
} from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "./store";

export const listenerMiddleware = createListenerMiddleware();

export const appStartListening = listenerMiddleware.startListening.withTypes<
  RootState,
  AppDispatch
>();

export type AppStartListening = typeof appStartListening;

export const forkWithCancelAction =
  (listenerAPI: ListenerEffectAPI<RootState, AppDispatch>) =>
  <T>(
    cancelPattern: AnyListenerPredicate<RootState>,
    executor: ForkedTaskExecutor<T, RootState>,
  ) => {
    const mainTask = listenerAPI.fork((...args) =>
      Promise.resolve(executor(...args)).finally(() => cancelTask.cancel()),
    );
    const cancelTask: ForkedTask<unknown> = listenerAPI.fork(({ take }) =>
      take(cancelPattern).then(() => mainTask.cancel()),
    );
    return mainTask;
  };
