import { bufferToHex } from "$lib/utils";
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

interface ISampleState {
  id: string;
  hash: string;
  title: string;
}

interface ISavedSampleState {
  sampleList: string[];
  samples: {
    [id: string]: ISampleState;
  };
}

interface ITempSampleState {
  playing: {
    [id: string]: boolean;
  };
}

interface IAddSamplePayload {
  id: string;
  data: Blob;
  title: string;
}

const addSample = createAsyncThunk(
  "addSample",
  async (payload: IAddSamplePayload) => {
    const hash = bufferToHex(
      await self.crypto.subtle.digest("SHA-1", await payload.data.arrayBuffer())
    );
    return { ...payload, hash };
  }
);

const savedSlice = createSlice({
  name: "savedSamples",
  initialState: { sampleList: [], samples: {} } as ISavedSampleState,
  reducers: {
    deleteSample: (state, action: PayloadAction<string>) => {
      state.sampleList = state.sampleList.filter((id) => id !== action.payload);
      delete state.samples[action.payload];
    },
  },
  extraReducers: (builder) =>
    builder.addCase(
      addSample.fulfilled,
      (state, action: PayloadAction<ISampleState>) => {
        state.sampleList.push(action.payload.id);
        state.samples[action.payload.id] = {
          id: action.payload.id,
          hash: action.payload.hash,
          title: action.payload.hash,
        };
      }
    ),
});

const tempSlice = createSlice({
  name: "tempSamples",
  initialState: { playing: {} } as ITempSampleState,
  reducers: {
    playSample: (state, action: PayloadAction<string>) => {
      state.playing[action.payload] = true;
    },
    stopSample: (state, action: PayloadAction<string>) => {
      state.playing[action.payload] = false;
    },
    stopAllSamples: (state) => {
      for (const id in state.playing) {
        state.playing[id] = false;
      }
    },
  },
  extraReducers: (builder) =>
    builder.addCase(addSample.fulfilled, (state, action) => {
      state.playing[action.payload.id] = false;
    }),
});

const { deleteSample } = savedSlice.actions;
const { playSample, stopSample, stopAllSamples } = tempSlice.actions;
const savedSampleReducer = savedSlice.reducer;
const tempSampleReducer = tempSlice.reducer;

export {
  addSample,
  deleteSample,
  playSample,
  stopSample,
  stopAllSamples,
  savedSampleReducer,
  tempSampleReducer,
};
