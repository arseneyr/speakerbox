import { v4 } from "uuid";
import { State } from "./stateType";
import xxhash from "../xxhash";
import produce from "immer";
import { decodeAudio } from "./decodeAudio";
import { ThunkAction } from "redux-thunk";
import { createAction, ActionsUnion } from "./utils";

const LOAD_FROM_FILE_STARTED = "LOAD_FROM_FILE_STARTED";
const LOAD_FROM_FILE_SUCCESS = "LOAD_FROM_FILE_SUCCESS";
const LOAD_FROM_FILE_FAILURE = "LOAD_FROM_FILE_FAILURE";

const loadFromFileStarted = (p: { id: string; title: string }) =>
  createAction(LOAD_FROM_FILE_STARTED, p);

const loadFromFileSuccess = (p: {
  id: string;
  arrayBuffer: ArrayBuffer;
  hash: string;
}) => createAction(LOAD_FROM_FILE_SUCCESS, p);

const loadFromFileFailure = (p: { id: string; error: string }) =>
  createAction(LOAD_FROM_FILE_FAILURE, p);

const Actions = {
  loadFromFileStarted,
  loadFromFileSuccess,
  loadFromFileFailure,
};

export type LoadFileActionTypes = ActionsUnion<typeof Actions>;

export function loadFromFile(
  files: FileList
): ThunkAction<void, State, never, LoadFileActionTypes> {
  return function (dispatch) {
    for (const file of files) {
      const id = v4();
      dispatch(loadFromFileStarted({ id, title: file.name }));
      const reader = new FileReader();
      reader.onload = () => {
        dispatch(
          loadFromFileSuccess({
            id,
            arrayBuffer: reader.result as ArrayBuffer,
            hash: xxhash(reader.result!),
          })
        );

        dispatch(decodeAudio(id));
      };

      reader.onerror = () =>
        dispatch(loadFromFileFailure({ id, error: reader.error!.message }));
      reader.readAsArrayBuffer(file);
    }
  };
}

export function reducer(state: State, action: LoadFileActionTypes): State {
  return produce(state, (draft) => {
    switch (action.type) {
      case LOAD_FROM_FILE_STARTED:
        draft.sampleList.push(action.payload.id);
        draft.loadingSamples[action.payload.id] = {
          title: action.payload.title,
        };
        return;

      case LOAD_FROM_FILE_FAILURE: {
        if (!draft.sampleList.includes(action.payload.id)) {
          // Sample already deleted
          return;
        }
        (draft.loadingSamples[action.payload.id] as any).error =
          action.payload.error;
        return;
      }

      case LOAD_FROM_FILE_SUCCESS: {
        if (!draft.sampleList.includes(action.payload.id)) {
          // Sample already deleted
          return;
        }
        draft.loadingSamples[action.payload.id] = {
          title: draft.loadingSamples[action.payload.id]!.title,
          arrayBuffer: action.payload.arrayBuffer,
          hash: action.payload.hash,
        };
        return;
      }
    }
  });
}
