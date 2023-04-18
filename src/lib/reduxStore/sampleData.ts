import { createAction, type Middleware } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import listenerMiddleware from "./listenerMiddleware";

type SampleDataId = string & { __brand: "SampleDataId" };

interface SampleData {
  id: SampleDataId;
  loading: boolean;
}

const createNewSample = createAction<Blob>("createSample");

function sampleMiddleware(): Middleware<unknown, RootState> {
  listenerMiddleware.startListening();
  return ({ dispatch }) =>
    (next) =>
    (action) => {
      if (createNewSample.match(action)) {
        action.payload;
        dispatch();
      }
    };
}

export type { SampleDataId };
