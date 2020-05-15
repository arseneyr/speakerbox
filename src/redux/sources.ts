import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-webpack-loader-syntax
import createLoadSourceWorker from "workerize-loader!./load_source.worker";
import * as LoadSourceWorker from "./load_source.worker";
import localForage from "localforage";

interface AudioSource {
  id: string;
  title: string;
}

const audioSourceEntity = createEntityAdapter<AudioSource>();
const audioSourceSelectors = audioSourceEntity.getSelectors(
  (state: any) => state.sources
);

const loadFileThunk = createAsyncThunk(
  "sources/loadFile",
  async (file: Blob, { getState }) => {
    const title = file instanceof File ? file.name : "BLOB";
    const id = await createLoadSourceWorker<typeof LoadSourceWorker>().loadFile(
      file
    );
    return { id, title };
  }
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
