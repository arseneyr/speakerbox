import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { recorderSupported, recordStream } from "./record";
import { RootState } from "@app/store";
import { getStream, NoAudioTracksError, PermissionDeniedError } from "./stream";
import {
  AppStartListening,
  forkWithCancelAction,
} from "@app/listenerMiddleware";
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
    stopRecording(state) {
      if (state === RecorderState.RECORDING) {
        return RecorderState.READY;
      }
    },
    clearError(state) {
      switch (state) {
        case RecorderState.ERROR_NO_AUDIO:
        case RecorderState.ERROR_NO_PERMISSION:
        case RecorderState.ERROR_OTHER:
          return RecorderState.READY;
      }
    },
  },
});

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
      const blobTask = forkWithCancelAction(listenerAPI)(
        stopRecording.match,
        async ({ pause, signal }) => {
          const stream = await pause(getStream());
          const { blob, stop } = recordStream(stream);
          signal.onabort = stop;
          return blob;
        },
      );
      const taskResult = await blobTask.result;
      switch (taskResult.status) {
        case "ok": {
          const audioSourceId = generateAudioSourceId();
          listenerAPI.dispatch(
            createAudioSource({ id: audioSourceId, blob: taskResult.value }),
          );
          listenerAPI.dispatch(recordingReady({ audioSourceId }));
          break;
        }
        case "rejected": {
          listenerAPI.dispatch(
            recordingError(getNewStateFromError(taskResult.error)),
          );
          break;
        }
        case "cancelled":
          break;
        default:
          throw Error("unknown task status");
      }

      listenerAPI.subscribe();
    },
  });

// Actions
const {
  startRecording,
  recordingReady,
  recordingError,
  stopRecording,
  clearError,
} = recorderSlice.actions;
export { startRecording, stopRecording, recordingReady, clearError };

// Selector
export const selectRecorder = (rootState: RootState) => rootState.recorder;

export const recorderReducer = recorderSlice.reducer;
