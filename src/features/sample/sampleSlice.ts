import {
  PayloadAction,
  ThunkAction,
  UnknownAction,
  createEntityAdapter,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { RootState } from "@app/store";
import {
  isSourceLoading,
  playAudioSource,
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

const playSample =
  (id: string): ThunkAction<void, RootState, undefined, UnknownAction> =>
  (dispatch, getState) => {
    const sample = selectSampleById(getState(), id);
    dispatch(playAudioSource(sample.sourceId));
  };

// Selectors
const sampleSelectors = samplesAdapter.getSelectors<RootState>(
  (state) => state.samples,
);

export const selectAllSampleIds = sampleSelectors.selectIds;
export const selectAllSamples = sampleSelectors.selectAll;
export const selectSampleById = sampleSelectors.selectById;
export const selectSampleSource = (rootState: RootState, sampleId: string) => {
  const { sourceId } = selectSampleById(rootState, sampleId);
  return selectAudioSourceById(rootState, sourceId);
};
export const selectIsSampleLoading = createSelector(
  [selectSampleSource],
  isSourceLoading,
);
export const selectSampleDurationMs = createSelector(
  [selectSampleSource],
  (source) => source.durationMs,
);

// Actions
export const { createSample } = sampleSlice.actions;
export { playSample };

// Reducer
const sampleReducer = sampleSlice.reducer;
export default sampleReducer;
