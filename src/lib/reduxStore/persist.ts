import {
  createNextState,
  type Middleware,
  type Reducer,
} from "@reduxjs/toolkit";
import type { Doc } from "automerge";
import { mergeableInit } from "./automerge";

interface IBackend {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

interface IBackendTable {
  [name: string]: () => IBackend | Promise<IBackend>;
}

interface CreatePersistOptions<T extends Record<string, unknown>> {
  name: string;
  reducer: Reducer<T>;
  backends: IBackendTable;
}

interface IPersistState<T extends Record<string, unknown>> {
  localState: Doc<T>;
  remoteState: Doc<T> | null;
}

function createPersist<
  T extends Record<string, unknown>,
  S extends Record<string, unknown>
>(
  options: CreatePersistOptions<T>
): {
  reducerWrapper: (reducer: Reducer<S>) => Reducer<S>;
  middleware: Middleware;
  selector: (state: S) => T;
} {
  const { name, reducer, backends } = options;

  function reducerWrapper(wrappedReducer: Reducer<S>): Reducer<S> {
    return (state, action) =>
      createNextState(wrappedReducer(state, action), (draft) => {
        if (state === undefined) {
          draft[name] = {
            localState: mergeableInit(reducer(undefined, action)),
            remoteState: null,
          };
          return;
        }
      });
  }
}
