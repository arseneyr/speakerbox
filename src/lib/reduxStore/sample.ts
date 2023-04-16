import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { SampleDataId } from "./sampleData";
import type { RootState } from "./store";

type SampleId = string & { __brand: "SampleId" };

interface Sample {
  readonly id: SampleId;
  readonly sampleDataId: SampleDataId;
  readonly title: string;
}

const sampleAdapter = createEntityAdapter<Sample>({});

const sampleSlice = createSlice({
  name: "samples",
  initialState: sampleAdapter.getInitialState(),
  reducers: {
    addSample: sampleAdapter.addOne,
  },
});

const sampleSelectors = sampleAdapter.getSelectors<RootState>(
  (state) => state.samples
);

export default sampleSlice.reducer;

export const { addSample } = sampleSlice.actions;
export { sampleSelectors };
