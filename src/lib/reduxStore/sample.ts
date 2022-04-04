import { mergeableMerge } from "$lib/sync/automerge";
import {
  MAIN_VERSION_1_0,
  SampleInfo,
  type MergeableMainState,
} from "$lib/types";
import {
  createAction,
  createSlice,
  type PayloadAction,
  type Reducer,
} from "@reduxjs/toolkit";
import { mergeableChange, mergeableInit } from "./automerge";
import { fetchRemoteState, signOut } from "./remoteBackend";

interface TempSampleState {
  [id: string]: {
    playing: boolean;
  };
}

interface SampleState {
  savedState: MergeableMainState;
  tempState: TempSampleState;
}

const initialState: SampleState = {
  savedState: mergeableInit({
    version: MAIN_VERSION_1_0.value,
    sampleList: [],
    samples: {},
  }),
  tempState: {},
};

type AddSamplePayload = SampleInfo & { id: string };

const addSample = createAction<AddSamplePayload>("samples/addSample");
const setSamplePlaying = createAction<{ id: string; playing: boolean }>(
  "samples/setSamplePlaying"
);
const stopAllSamples = createAction("samples/stopAllSamples");
const deleteSample = createAction<string>("samples/deleteSample");

// const fetchRemoteState = createAsyncThunk("samples/fetchRemoteState", async);

const sampleSlice = createSlice({
  name: "samples",
  initialState,
  reducers: {
    addSample(state, action: PayloadAction<AddSamplePayload>) {
      const sample = action.payload;
      state.savedState = mergeableChange(state.savedState, (s) => {
        s.samples[sample.id] = sample;
        s.sampleList.push(sample.id);
      });
      state.tempState[sample.id];
    },
    setSamplePlaying(
      state,
      action: PayloadAction<{ id: string; playing: boolean }>
    ) {
      state.tempState[action.payload.id].playing = action.payload.playing;
    },
    stopAllSamples(state) {
      for (const s of Object.values(state.tempState)) {
        s.playing = false;
      }
    },
    deleteSample(state, action: PayloadAction<string>) {
      state.savedState = mergeableChange(state.savedState, (s) => {
        delete s.samples[action.payload];
        const i = s.sampleList.indexOf(action.payload);
        if (i >= 0) {
          s.sampleList.splice(i, 1);
        }
      });
      delete state.tempState[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRemoteState.fulfilled, (state, action) => {
      if (action.payload === null) {
        return;
      }
      state.savedState = mergeableMerge(state.savedState, action.payload);
    });
  },
});

export default sampleSlice.reducer;
