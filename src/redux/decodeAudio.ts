import { ThunkAction } from "redux-thunk";
import { State } from "./stateType";
import { decodeAudioData, sliceAudioBuffer } from "../audioUtils";
import produce from "immer";
import { createAction, ActionsUnion } from "./utils";

const DECODE_AUDIO_SUCCESS = "DECODE_AUDIO_SUCCESS";
const DECODE_AUDIO_FAILURE = "DECODE_AUDIO_FAILURE";

const decodeAudioSuccess = (p: { id: string; audioBuffer: AudioBuffer }) =>
  createAction(DECODE_AUDIO_SUCCESS, p);

const decodeAudioFailure = (p: { id: string; error: string }) =>
  createAction(DECODE_AUDIO_FAILURE, p);

const Actions = { decodeAudioSuccess, decodeAudioFailure };

export type DecodeAudioActionTypes = ActionsUnion<typeof Actions>;

export function decodeAudio(
  id: string
): ThunkAction<void, State, never, DecodeAudioActionTypes> {
  return async function(dispatch, getState) {
    const state = getState();
    const workingSample = state.workingSampleData[id];
    if (workingSample && workingSample.audioBuffer) {
      return;
    }
    let arrayBuffer: ArrayBuffer | null | undefined = null;
    const storedSample = state.storedSamples[id];
    if (storedSample) {
      arrayBuffer = state.savedBuffers[storedSample.arrayBufferHandle];
    } else {
      const loadingSample = state.loadingSamples[id];
      arrayBuffer =
        loadingSample && "arrayBuffer" in loadingSample
          ? loadingSample.arrayBuffer
          : null;
    }
    arrayBuffer &&
      decodeAudioData(arrayBuffer.slice(0))
        .then(audioBuffer =>
          dispatch(
            decodeAudioSuccess({
              id,
              audioBuffer: storedSample
                ? sliceAudioBuffer(
                    audioBuffer,
                    storedSample.start,
                    storedSample.end
                  )
                : audioBuffer
            })
          )
        )
        .catch(error =>
          dispatch(
            decodeAudioFailure({ id, error: (error as DOMException).message })
          )
        );
  };
}

export function reducer(state: State, action: DecodeAudioActionTypes) {
  return produce(state, draft => {
    switch (action.type) {
      case DECODE_AUDIO_SUCCESS: {
        if (!draft.sampleList.includes(action.payload.id)) {
          // Sample was deleted while loading
          return;
        }
        const loadingSample = draft.loadingSamples[action.payload.id];
        if (loadingSample && "arrayBuffer" in loadingSample) {
          draft.storedSamples[action.payload.id] = {
            title: loadingSample.title,
            start: 0,
            end: action.payload.audioBuffer.duration,
            arrayBufferHandle: loadingSample.hash
          };
          draft.savedBuffers[loadingSample.hash] ||
            (draft.savedBuffers[loadingSample.hash] =
              loadingSample.arrayBuffer);
          delete draft.loadingSamples[action.payload.id];
        }

        draft.workingSampleData[action.payload.id] = {
          audioBuffer: action.payload.audioBuffer
        };
        return;
      }
      case DECODE_AUDIO_FAILURE: {
        if (!draft.sampleList.includes(action.payload.id)) {
          // Sample was deleted while loading
          return;
        }
        draft.workingSampleData[action.payload.id] = {
          error: action.payload.error
        };
        delete draft.loadingSamples[action.payload.id];
        return;
      }
    }
  });
}
