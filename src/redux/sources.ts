import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createNextState,
} from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-webpack-loader-syntax
import createLoadSourceWorker from "workerize-loader!./load_source.worker";
import * as LoadSourceWorker from "./load_source.worker";
import localForage from "localforage";
import { RootState } from ".";

declare module "immer" {
  export type Draft<T> = T extends ArrayBuffer ? T : Draft<T, T>;
}

interface AudioSource {
  id: string;
  title: string;
  buffer: ArrayBuffer;
}

const audioSourceEntity = createEntityAdapter<AudioSource>();
const audioSourceSelectors = audioSourceEntity.getSelectors(
  (state: any) => state.sources
);

const loadFileThunk = createAsyncThunk(
  "sources/loadFile",
  async (file: Blob, { getState }) => {
    const title = file instanceof File ? file.name : "BLOB";
    const { id, buffer } = await createLoadSourceWorker<
      typeof LoadSourceWorker
    >().loadFile(file);
    return { id, title, buffer };
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
    return { id: hash, buffer, title };
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
    builder.addCase(saveSourceThunk.fulfilled, audioSourceEntity.addOne);
  },
});

export async function migrate(state: RootState): Promise<RootState> {
  const newSources = (
    await Promise.all(
      audioSourceSelectors.selectAll(state).map(async (source) => ({
        ...source,
        buffer: (await localForage.getItem(source.id)) as ArrayBuffer,
      }))
    )
  ).filter(({ buffer }) => Boolean(buffer));
  return createNextState(state, (draft) => {
    audioSourceEntity.setAll(draft.sources, newSources);
  });
}

export const { deleteSource } = sourcesSlice.actions;
export {
  loadFileThunk as loadFile,
  saveSourceThunk as saveSource,
  audioSourceSelectors as sourceSelectors,
};
export default sourcesSlice.reducer;
