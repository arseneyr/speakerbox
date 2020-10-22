import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createNextState,
  Draft,
} from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-webpack-loader-syntax
import createLoadSourceWorker from "workerize-loader?name=static/js/[hash].js!./load_source.worker";
import * as LoadSourceWorker from "./load_source.worker";
import localForage from "localforage";
import { createTransform } from "redux-persist";
import { RootState } from ".";

interface AudioSource {
  id: string;
  title: string;
  objectUrl?: string;
}

const audioSourceEntity = createEntityAdapter<AudioSource>();
const audioSourceSelectors = audioSourceEntity.getSelectors(
  (state: any) => state.sources
);

const loadFileThunk = createAsyncThunk(
  "sources/loadFile",
  async (file: Blob, { getState }) => {
    const title = file instanceof File ? file.name : "BLOB";
    const res = await createLoadSourceWorker<
      typeof LoadSourceWorker
    >().loadFile(file);
    return { ...res, title };
  }
);

const saveSourceThunk = createAsyncThunk(
  "sources/saveSource",
  async ({ buffer, title }: { buffer: ArrayBuffer; title: string }) => {
    const hash = btoa(
      String.fromCharCode(
        ...new Uint8Array(await window.crypto.subtle.digest("SHA-1", buffer))
      )
    );
    await localForage.setItem(hash, buffer);
    return {
      id: hash,
      title,
      objectUrl: URL.createObjectURL(new Blob([buffer])),
    };
  }
);

const getSourceUrl = createAsyncThunk(
  "sources/getSourceUrl",
  async (id: string) => {
    const arrayBuffer = await localForage.getItem<ArrayBuffer>(id);
    if (!arrayBuffer) {
      throw new Error("Source not found");
    }

    return {
      id,
      changes: { objectUrl: URL.createObjectURL(new Blob([arrayBuffer])) },
    };
  }
);

const sourcesSlice = createSlice({
  name: "sources",
  initialState: audioSourceEntity.getInitialState(),
  reducers: {
    deleteSource: audioSourceEntity.removeOne,
  },
  extraReducers: (builder) =>
    builder
      .addCase(loadFileThunk.fulfilled, audioSourceEntity.addOne)
      .addCase(saveSourceThunk.fulfilled, audioSourceEntity.addOne)
      .addCase(getSourceUrl.fulfilled, audioSourceEntity.updateOne),
});

const sourcesTransform = createTransform<RootState, RootState>(
  createNextState((draft) => {
    Object.values(audioSourceSelectors.selectEntities(draft)).forEach(
      (v) => delete v?.objectUrl
    );
  }),
  (state) => state,
  { whitelist: ["sources"] }
);

export const { deleteSource } = sourcesSlice.actions;
export {
  loadFileThunk as loadFile,
  saveSourceThunk as saveSource,
  audioSourceSelectors as sourceSelectors,
  sourcesTransform,
  getSourceUrl,
};

export default sourcesSlice.reducer;
