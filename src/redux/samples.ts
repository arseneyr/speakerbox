import { createAction, ActionsUnion } from "./utils";
import { State } from "./stateType";
import produce from "immer";
import { sliceAudioBuffer } from "../audioUtils";

const DELETE_SAMPLE = "DELETE_SAMPLE";
const EDIT_SAMPLE = "EDIT_SAMPLE";
const EDIT_CANCEL = "EDIT_CANCEL";
const EDIT_DONE = "EDIT_DONE";

export const deleteSample = (p: { id: string }) =>
  createAction(DELETE_SAMPLE, p);

export const editSample = (p: { id: string }) => createAction(EDIT_SAMPLE, p);
export const editCancel = () => createAction(EDIT_CANCEL);
export const editDone = (p: {
  newStart: number;
  newEnd: number;
  newTitle: string;
}) => createAction(EDIT_DONE, p);

export const Actions = { deleteSample, editSample, editCancel, editDone };
export type SampleActionType = ActionsUnion<typeof Actions>;

export function reducer(state: State, action: SampleActionType) {
  return produce(state, draft => {
    switch (action.type) {
      case DELETE_SAMPLE:
        if (
          draft.editingSample &&
          draft.editingSample.id === action.payload.id
        ) {
          // deleting the currently editing sample is not allowed
          return;
        }
        draft.sampleList.splice(draft.sampleList.indexOf(action.payload.id), 1);
        delete draft.loadingSamples[action.payload.id];
        delete draft.storedSamples[action.payload.id];
        delete draft.workingSampleData[action.payload.id];
        return;
      case EDIT_SAMPLE:
        draft.editingSample = { id: action.payload.id };
        return;
      case EDIT_CANCEL:
        delete draft.editingSample;
        return;
      case EDIT_DONE:
        const id = draft.editingSample!.id;
        draft.storedSamples[id]!.title = action.payload.newTitle;
        draft.storedSamples[id]!.start += action.payload.newStart;
        draft.storedSamples[id]!.end =
          draft.storedSamples[id]!.start +
          (action.payload.newEnd - action.payload.newStart);
        draft.workingSampleData[id]!.audioBuffer = sliceAudioBuffer(
          draft.workingSampleData[id]!.audioBuffer!,
          action.payload.newStart,
          action.payload.newEnd
        );
        delete draft.editingSample;
        return;
    }
  });
}
