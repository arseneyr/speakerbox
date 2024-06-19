import {
  PayloadAction,
  createEntityAdapter,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { RootState } from "@app/store";
import {
  isSourceLoading,
  selectAudioSourceById,
} from "../audioSource/audioSourceSlice";

interface Sample {
  id: string;
  title: string;
  sourceId: string;
}

const samplesAdapter = createEntityAdapter<Sample>();

const sampleSlice = createSlice({
  name: "samples",
  initialState: samplesAdapter.getInitialState(),
  reducers: {
    createSample(
      state,
      action: PayloadAction<{ id: string; title: string; sourceId: string }>,
    ) {
      samplesAdapter.addOne(state, action.payload);
    },
  },
});

const sampleSelectors = samplesAdapter.getSelectors<RootState>(
  (state) => state.samples,
);

export const selectAllSampleIds = sampleSelectors.selectIds;
export const selectSampleById = sampleSelectors.selectById;
export const selectSampleSource = (rootState: RootState, sampleId: string) => {
  const { sourceId } = selectSampleById(rootState, sampleId);
  return selectAudioSourceById(rootState, sourceId);
};
export const selectIsSampleLoading = createSelector(
  [selectSampleSource],
  isSourceLoading,
);

export const { createSample } = sampleSlice.actions;

const sampleReducer = sampleSlice.reducer;
export default sampleReducer;
