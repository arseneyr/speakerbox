import {
  configureStore,
  applyMiddleware,
  createStore,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import {
  editCancel,
  editDone,
  editSample,
  deleteSample,
  SampleActionType,
  reducer as sampleReducer,
} from "./samples";
import {
  loadFromFile,
  LoadFileActionTypes,
  reducer as loadFileReducer,
} from "./loadFile";
import {
  decodeAudio,
  DecodeAudioActionTypes,
  reducer as decodeAudioReducer,
} from "./decodeAudio";
import { reduceReducers } from "./utils";
import { State } from "./stateType";
import thunk from "redux-thunk";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import localforage from "localforage";

localforage.config({
  driver: localforage.INDEXEDDB,
});

const initialState: State = {
  sampleList: [],
  loadingSamples: {},
  savedBuffers: {},
  storedSamples: {},
  workingSampleData: {},
};

const reducer = persistReducer(
  {
    key: "root",
    version: 1,
    storage: localforage,
    whitelist: ["sampleList", "storedSamples", "savedBuffers"],
    serialize: false,
    deserialize: false,
  } as any,
  reduceReducers<
    State,
    SampleActionType & LoadFileActionTypes & DecodeAudioActionTypes
  >(initialState, sampleReducer, loadFileReducer, decodeAudioReducer)
);

//const store = createStore(reducer, applyMiddleware(thunk));
const store = configureStore({
  reducer: reducer,
  middleware: getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }),
});
persistStore(store as any);

export {
  editCancel,
  editDone,
  editSample,
  deleteSample,
  loadFromFile,
  decodeAudio,
  store,
};
