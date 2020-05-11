import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import {
  sliceAudioBuffer as sliceBuffer,
  decodeAudioData,
} from "./audio_utils";
import localForage from "localforage";
import { sampleSelectors } from "./samples";

interface AudioBufferEntity {
  id: string;
  audioBuffer: AudioBuffer;
}

const audioBufferAdapter = createEntityAdapter<AudioBufferEntity>();
const audioBufferSelectors = audioBufferAdapter.getSelectors(
  (state: any) => state.audioBuffers
);

const decodeSourceThunk = createAsyncThunk(
  "audioBuffers/decodeSource",
  async (
    { sourceId, sampleId }: { sourceId: string; sampleId: string },
    { getState, dispatch }
  ) => {
    const buffer: ArrayBuffer = await localForage.getItem(sourceId);
    const audioBuffer = await decodeAudioData(buffer);
    const ret = dispatch(addAudioBuffer({ id: sampleId, audioBuffer })).payload;
    const sample = sampleSelectors.selectById(getState(), sampleId);
    if (sample && "start" in sample) {
      dispatch(
        sliceAudioBuffer({
          id: sampleId,
          newStart: sample.start,
          newEnd: sample.end,
        })
      );
    }
    return ret;
  }
);

const audioBufferSlice = createSlice({
  name: "audioBuffers",
  initialState: audioBufferAdapter.getInitialState(),
  reducers: {
    addAudioBuffer: audioBufferAdapter.addOne,
    sliceAudioBuffer: (
      state,
      {
        payload,
      }: PayloadAction<{ id: string; newStart: number; newEnd: number }>
    ) => {
      const { audioBuffer } = audioBufferAdapter
        .getSelectors()
        .selectById(state, payload.id)!;
      audioBufferAdapter.updateOne(state, {
        id: payload.id,
        changes: {
          audioBuffer: sliceBuffer(
            audioBuffer,
            payload.newStart,
            payload.newEnd
          ),
        },
      });
    },
    removeAudioBuffer: audioBufferAdapter.removeOne,
  },
});

export const {
  addAudioBuffer,
  sliceAudioBuffer,
  removeAudioBuffer,
} = audioBufferSlice.actions;
export { decodeSourceThunk as decodeSource, audioBufferSelectors };
export default audioBufferSlice.reducer;
