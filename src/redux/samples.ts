import { sliceAudioBuffer, decodeAudioData } from "../audioUtils";
import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  PayloadAction,
  createNextState,
} from "@reduxjs/toolkit";
import localForage from "localforage";

interface PartialSample {
  id: string;
  title: string;
  sourceId?: string;
}
export interface FullSample extends PartialSample {
  start: number;
  end: number;
  audioBuffer?: AudioBuffer;
}
type Sample = (PartialSample & { error: string }) | PartialSample | FullSample;

const samplesEntityAdapter = createEntityAdapter<Sample>();
const samplesEntitySelectors = samplesEntityAdapter.getSelectors(
  (state: any) => state.samples
);
const samplesEntityLocalSelectors = samplesEntityAdapter.getSelectors();

const decodeSourceThunk = createAsyncThunk(
  "samples/decodeSource",
  async ({ sourceId, sampleId }: { sourceId: string; sampleId: string }) => {
    const buffer: ArrayBuffer = await localForage.getItem(sourceId);
    const audioBuffer = await decodeAudioData(buffer);
    return { id: sampleId, audioBuffer };
  }
);

const samplesSlice = createSlice({
  name: "samples",
  initialState: samplesEntityAdapter.getInitialState({ editing: "" }),
  reducers: {
    setSourceId: (
      state,
      { payload }: PayloadAction<{ sampleId: string; sourceId: string }>
    ) =>
      samplesEntityAdapter.updateOne(state, {
        id: payload.sampleId,
        changes: { sourceId: payload.sourceId },
      }),
    deleteSample: (state, action) => {
      samplesEntityAdapter.removeOne(state, action);
      if (action.payload === state.editing) {
        state.editing = "";
      }
    },
    createSample: samplesEntityAdapter.addOne,
    startEditing: (state, { payload: id }: PayloadAction<string>) => {
      state.editing = id;
    },
    cancelEditing: (state) => {
      state.editing = "";
    },
    finishEditing: (
      state,
      {
        payload,
      }: PayloadAction<{ newTitle: string; newStart: number; newEnd: number }>
    ) => {
      const sample = samplesEntityLocalSelectors.selectById(
        state,
        state.editing
      );
      if (sample && "audioBuffer" in sample && sample.audioBuffer) {
        samplesEntityAdapter.updateOne(state, {
          id: state.editing,
          changes: {
            title: payload.newTitle,
            start: payload.newStart,
            end: payload.newEnd,
            audioBuffer: sliceAudioBuffer(
              sample.audioBuffer,
              payload.newStart,
              payload.newEnd
            ),
          },
        });
      } else {
        console.error("Editing a non-existant sample!", state.editing);
      }
      state.editing = "";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(decodeSourceThunk.fulfilled, (state, { payload }) => {
      const sample = samplesEntityLocalSelectors.selectById(state, payload.id);
      if (!sample) {
        console.error("Sample deleted before decoding finished!", payload.id);
        return;
      }

      const newSample =
        "start" in sample
          ? {
              ...sample,
              audioBuffer: sliceAudioBuffer(
                payload.audioBuffer,
                sample.start,
                sample.end
              ),
            }
          : {
              ...sample,
              audioBuffer: payload.audioBuffer,
              start: 0,
              end: payload.audioBuffer.duration,
            };
      samplesEntityAdapter.updateOne(state, {
        id: newSample.id,
        changes: newSample,
      });
    });
    builder.addCase(
      decodeSourceThunk.rejected,
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
  },
});

export const samplePersistTransform = (
  state: ReturnType<typeof samplesSlice.reducer>
) =>
  createNextState(state, (draft) => {
    const entities = samplesEntityLocalSelectors.selectEntities(draft);
    samplesEntityAdapter.removeMany(
      draft,
      Object.values(entities)
        .filter((s) => !s!.sourceId || (s as any).error)
        .map((s) => s!.id)
    );
    for (const sample of Object.values(draft.entities)) {
      sample && "audioBuffer" in sample && delete sample.audioBuffer;
    }
    draft.editing = "";
  });

export const {
  deleteSample,
  startEditing,
  finishEditing,
  cancelEditing,
  createSample,
  setSourceId,
} = samplesSlice.actions;
export {
  decodeSourceThunk as decodeSource,
  samplesEntitySelectors as sampleSelectors,
};
export default samplesSlice.reducer;
