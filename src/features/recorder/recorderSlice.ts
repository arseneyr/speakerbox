import { createAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { recorderSupported, recordStream } from "./record";
// import { call, put, race, select, take, takeLeading } from "redux-saga/effects";
import { RootState } from "@app/store";
import { getStream, NoAudioTracksError, PermissionDeniedError } from "./stream";
import { AppStartListening } from "@app/listenerMiddleware";
import {
  createAudioSource,
  generateAudioSourceId,
} from "@features/audioSource/audioSourceSlice";

export enum RecorderState {
  UNSUPPORTED = "unsupported",
  READY = "ready",
  RECORDING = "recording",
  ERROR_NO_PERMISSION = "error_no_permission",
  ERROR_NO_AUDIO = "error_no_audio",
  ERROR_OTHER = "error",
}

const recorderSlice = createSlice({
  name: "recorder",
  initialState: (): RecorderState =>
    recorderSupported() ? RecorderState.READY : RecorderState.UNSUPPORTED,
  reducers: {
    startRecording(state) {
      if (state !== RecorderState.UNSUPPORTED) {
        return RecorderState.RECORDING;
      }
    },
    recordingReady(state, _action: PayloadAction<{ audioSourceId: string }>) {
      if (state === RecorderState.RECORDING) {
        return RecorderState.READY;
      }
    },
    recordingError(
      state,
      { payload: errorState }: PayloadAction<RecorderState>,
    ) {
      if (state === RecorderState.RECORDING) {
        return errorState;
      }
    },
    // permissionDenied(state) {
    //   if (state === RecorderState.READY) {
    //     return RecorderState.ERROR_NO_PERMISSION;
    //   }
    //   return state;
    // },
    // noAudioTracks(state) {
    //   if (state === RecorderState.READY) {
    //     return RecorderState.ERROR_NO_AUDIO;
    //   }
    //   return state;
    // },
    // unknownError() {
    //   return RecorderState.ERROR_OTHER;
    // },
  },
});

// Selector

export const selectRecorder = (rootState: RootState) => rootState.recorder;

function getNewStateFromError(error: unknown) {
  if (error instanceof PermissionDeniedError) {
    return RecorderState.ERROR_NO_PERMISSION;
  }
  if (error instanceof NoAudioTracksError) {
    return RecorderState.ERROR_NO_AUDIO;
  }
  return RecorderState.ERROR_OTHER;
}

// Listener
export const startRecorderListener = (startAppListening: AppStartListening) =>
  startAppListening({
    actionCreator: startRecording,
    effect: async (_action, listenerAPI) => {
      listenerAPI.unsubscribe();
      const blobTask = listenerAPI.fork(async ({ pause, signal }) => {
        const stream = await pause(getStream());
        const { blob, stop } = recordStream(stream);
        signal.onabort = stop;
        return blob;
      });
      const stopListener = listenerAPI.fork(({ take }) =>
        take(stopRecording.match).then(() => blobTask.cancel()),
      );
      const taskResult = await blobTask.result;
      stopListener.cancel();
      console.log(taskResult);
      if (taskResult.status === "rejected") {
        listenerAPI.dispatch(
          recordingError(getNewStateFromError(taskResult.error)),
        );
      } else if (taskResult.status === "ok") {
        const audioSourceId = generateAudioSourceId();
        listenerAPI.dispatch(
          createAudioSource({ id: audioSourceId, blob: taskResult.value }),
        );
        listenerAPI.dispatch(recordingReady({ audioSourceId }));
      }
      listenerAPI.subscribe();
    },
  });

// Actions
const {
  startRecording,
  recordingReady,
  recordingError,
  // permissionDenied,
  // noAudioTracks,
  // unknownError,
} = recorderSlice.actions;
const stopRecording = createAction("recorder/stopRecording");
export { startRecording, stopRecording, recordingReady };

// const startRecording = createAsyncThunk<Blob, void, { state: RootState }>(
//   "recorder/startRecording",
//   async (_, { getState }) => {
//     if (selectRecorder(getState()) !== RecorderState.RECORDING) {
//       throw "invalid state to start recording";
//     }
//     const stream = await getStream();
//   },
// );

// function* recorderSaga() {
//   const initialState: RecorderState = yield select(selectRecorder);
//   if (initialState !== RecorderState.READY) {
//     return;
//   }

//   yield takeLeading(startRecording.type, recordingInstanceSaga);
// }

export const recorderReducer = recorderSlice.reducer;
