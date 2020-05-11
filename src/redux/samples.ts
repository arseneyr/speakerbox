import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
} from "@reduxjs/toolkit";
import { decodeSource, sliceAudioBuffer } from "./audio_buffer";

interface PartialSample {
  id: string;
  title: string;
  sourceId?: string;
}
export interface FullSample extends PartialSample {
  start: number;
  end: number;
}
type Sample = (PartialSample & { error: string }) | PartialSample | FullSample;

const samplesEntityAdapter = createEntityAdapter<Sample>();
const samplesEntitySelectors = samplesEntityAdapter.getSelectors(
  (state: any) => state.samples
);
const samplesEntityLocalSelectors = samplesEntityAdapter.getSelectors();

const samplesSlice = createSlice({
  name: "samples",
  initialState: samplesEntityAdapter.getInitialState(),
  reducers: {
    setSourceId: (
      state,
      { payload }: PayloadAction<{ sampleId: string; sourceId: string }>
    ) =>
      samplesEntityAdapter.updateOne(state, {
        id: payload.sampleId,
        changes: { sourceId: payload.sourceId },
      }),
    deleteSample: samplesEntityAdapter.removeOne,
    createSample: samplesEntityAdapter.addOne,
    updateTitle: (
      state,
      { payload }: PayloadAction<{ id: string; title: string }>
    ) =>
      samplesEntityAdapter.updateOne(state, {
        id: payload.id,
        changes: { title: payload.title },
      }),
  },
  extraReducers: (builder) => {
    builder.addCase(decodeSource.fulfilled, (state, { payload }) => {
      const sample = samplesEntityLocalSelectors.selectById(state, payload.id);
      if (!sample) {
        console.error("Sample deleted before decoding finished!", payload.id);
        return;
      }

      if (!("start" in sample)) {
        samplesEntityAdapter.updateOne(state, {
          id: payload.id,
          changes: {
            start: 0,
            end: payload.audioBuffer.duration,
          },
        });
      }
    });
    builder.addCase(
      decodeSource.rejected,
      (
        state,
        {
          error,
          meta: {
            arg: { sampleId },
          },
        }
      ) =>
        samplesEntityAdapter.updateOne(state, {
          id: sampleId,
          changes: { error: "Failed to decode!" },
        })
    );
    builder.addCase(sliceAudioBuffer, (state, { payload }) => {
      samplesEntityAdapter.updateOne(state, {
        id: payload.id,
        changes: {
          start: payload.newStart,
          end: payload.newEnd,
        },
      });
    });
  },
});

export const {
  deleteSample,
  createSample,
  setSourceId,
  updateTitle,
} = samplesSlice.actions;
export { samplesEntitySelectors as sampleSelectors };
export default samplesSlice.reducer;
