import { createAction, type Middleware } from "@reduxjs/toolkit";
import type { RootState } from "./store";

type SampleDataId = string & { __brand: "SampleDataId" };

interface SampleData {
  id: SampleDataId;
  loading: boolean;
}

const createNewSample = createAction<Blob>("createSample");

function sampleMiddleware(): Middleware<{}, RootState> {
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
