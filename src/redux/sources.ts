import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { h64 } from "xxhashjs";

declare module "immer" {
  type Draft<T> = T;
}

interface AudioSource {
  id: string;
  buffer: ArrayBuffer; //Omit<ArrayBuffer, typeof Symbol.toStringTag>;
}

const audioSourceEntity = createEntityAdapter<AudioSource>();
const audioSourceSelectors = audioSourceEntity.getSelectors(
  (state: any) => state.sources
);

const loadFileThunk = createAsyncThunk(
  "sources/loadFile",
  (file: Blob, { getState }) =>
    new Promise<AudioSource>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const id = h64(reader.result as ArrayBuffer, 0).toString();
        resolve(
          audioSourceSelectors.selectById(getState(), id) || {
            id,
            buffer: reader.result as ArrayBuffer,
          }
        );
      };

      reader.onerror = () => reject(reader.error?.message);
      reader.readAsArrayBuffer(file);
    })
);

const sourcesSlice = createSlice({
  name: "sources",
  initialState: audioSourceEntity.getInitialState(),
  reducers: {
    deleteSource: audioSourceEntity.removeOne,
  },
  extraReducers: (builder) => {
    builder.addCase(loadFileThunk.fulfilled, audioSourceEntity.addOne);
  },
});

export const { deleteSource } = sourcesSlice.actions;
export { loadFileThunk as loadFile, audioSourceSelectors as sourceSelectors };
export default sourcesSlice.reducer;
