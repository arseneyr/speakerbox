import { createSlice } from "@reduxjs/toolkit";
import { addSample } from "./sample";

interface ISampleDataState {
  [hash: string]: Blob;
}

const slice = createSlice({
  name: "sampleData",
  initialState: {} as ISampleDataState,
  reducers: {},
  extraReducers: (builder) =>
    builder.addCase(addSample.fulfilled, (state, action) => {
      state[action.payload.hash] = action.payload.data;
    }),
});

export default slice.reducer;
