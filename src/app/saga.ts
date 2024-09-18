import { fork } from "redux-saga/effects";
// import { audioSourceSaga } from "@features/audioSource/audioSourceSlice";
import { persistSaga } from "@features/persist/persistor";

export function* rootSaga() {
  yield fork(persistSaga);
  // yield fork(audioSourceSaga);
}
