import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
  createNextState,
  Draft,
  ThunkAction,
  PayloadAction,
  Update,
  AnyAction,
  ActionCreator,
  createSelector,
  Middleware,
} from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-webpack-loader-syntax
import createLoadSourceWorker, {
  Workerized,
} from "workerize-loader?name=static/js/[hash].js!./load_source.worker";
import type * as LoadSourceWorker from "./load_source.worker";
import localForage from "localforage";
import { createTransform, REHYDRATE } from "redux-persist";
import { AppDispatch, RootState } from ".";
import FileType from "file-type/browser";
import { createWorkerPool } from "./worker_pool";
import { v4 } from "uuid";
import { AudioContext } from "standardized-audio-context";
import { scheduleScan } from "./transcoder";
import { sampleSelectors } from "./samples";

interface AudioSource {
  id: string;
  title: string;
  mimeType?: string;
  transcoding?: boolean;
  objectUrl?: string | false;
}

const audioSourceEntity = createEntityAdapter<AudioSource>();
const audioSourceSelectors = audioSourceEntity.getSelectors(
  (state: RootState) => state.sources
);
const audioSourceLocalSelectors = audioSourceEntity.getSelectors();

export const workerPool = createWorkerPool<Workerized<typeof LoadSourceWorker>>(
  createLoadSourceWorker
);

const loadFileThunk = createAsyncThunk(
  "sources/loadFile",
  async (file: Blob, api) => {
    const title = file instanceof File ? file.name : "BLOB";
    const res = await workerPool.loadFile(file);
    api.dispatch(sourcesSlice.actions.saveSource({ ...res, title }));
    scheduleScan(api);
    return res;
  }
);

const saveBufferSourceThunk = createAsyncThunk(
  "sources/saveBufferSource",
  async (
    {
      buffer,
      title,
      mimeType,
    }: { buffer: ArrayBuffer; title: string; mimeType?: string },
    api
  ) => {
    const id = v4();
    await localForage.setItem(id, buffer);
    api.dispatch(
      sourcesSlice.actions.saveSource({
        id,
        title,
        mimeType: mimeType ?? (await FileType.fromBuffer(buffer))?.mime,
        objectUrl: URL.createObjectURL(new Blob([buffer])),
      })
    );
    scheduleScan(api);
    return { id };
  }
);

const getSourceUrl = createAsyncThunk(
  "sources/getSourceUrl",
  async (id: string) => {
    const buffer = await localForage.getItem<ArrayBuffer>(id);

    return {
      id,
      changes: {
        objectUrl: buffer ? URL.createObjectURL(new Blob([buffer])) : undefined,
      },
    };
  },
  {
    condition: (id, { getState }) =>
      audioSourceSelectors.selectById(getState() as RootState, id)
        ?.objectUrl === undefined,
  }
);

const sourcesSlice = createSlice({
  name: "sources",
  initialState: audioSourceEntity.getInitialState(),
  reducers: {
    saveSource: audioSourceEntity.upsertOne,
    deleteSource: audioSourceEntity.removeOne,
    updateSource: audioSourceEntity.updateOne,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSourceUrl.pending, (state, action) => {
        const source = audioSourceLocalSelectors.selectById(
          state,
          action.meta.arg
        );
        source && (source.objectUrl = false);
      })
      .addCase(getSourceUrl.fulfilled, audioSourceEntity.updateOne);
  },
});

const sourcesTransform = createTransform<RootState, RootState>(
  createNextState((draft) => {
    Object.values(audioSourceLocalSelectors.selectEntities(draft)).forEach(
      (v) => {
        delete v?.transcoding;
        delete v?.objectUrl;
      }
    );
  }),
  (state) => state,
  { whitelist: ["sources"] }
);

const sourcesMiddleware: Middleware = (api) => (next) => (action) => {
  const ret = next(action);
  if (action.type === REHYDRATE) {
    scheduleScan(api);
  }
  return ret;
};

const selectSource = createSelector(
  (state: RootState, id: string) => sampleSelectors.selectById(state, id),
  (state: RootState) => audioSourceSelectors.selectEntities(state),
  (sample, sourceEntities) =>
    sample?.sourceId ? sourceEntities[sample.sourceId] : undefined
);

const selectObjectUrl = createSelector(
  selectSource,
  (source) => source?.objectUrl
);

export const { deleteSource, updateSource } = sourcesSlice.actions;
export {
  loadFileThunk as loadFile,
  saveBufferSourceThunk as saveBufferSource,
  audioSourceSelectors as sourceSelectors,
  sourcesTransform,
  // selectSourceObjectUrl,
  sourcesMiddleware,
  getSourceUrl,
};

export default sourcesSlice.reducer;
