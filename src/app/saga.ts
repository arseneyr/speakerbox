import { fork } from "redux-saga/effects";
import { audioSourceSaga } from "@features/audioSource/audioSourceSlice";

export function* rootSaga() {
  yield fork(audioSourceSaga);
}
