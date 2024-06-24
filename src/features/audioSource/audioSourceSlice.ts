import {
  Action,
  PayloadAction,
  createEntityAdapter,
  createSelector,
  createSlice,
  isAnyOf,
} from "@reduxjs/toolkit";

import {
  call,
  cancel,
  cancelled,
  delay,
  fork,
  join,
  put,
  take,
  takeLatest,
} from "redux-saga/effects";
import { Player, createEncodedPlayer } from "./player";
import { CANCEL, Task } from "redux-saga";
import { GuardedType, SagaCancellablePromise } from "@common/utils";
import { RootState } from "@app/store";

enum AudioSourceState {
  CREATED = "created",
  LOADING = "loading",
  READY = "ready",
  PLAYING = "playing",
}

interface AudioSource {
  id: string;
  state: AudioSourceState;
  durationMs: number | null;
}

const audioSourceEntityAdapter = createEntityAdapter<AudioSource>();

const audioSourceSlice = createSlice({
  name: "audioSources",
  initialState: audioSourceEntityAdapter.getInitialState(),
  reducers: {
    createAudioSource(
      state,
      action: PayloadAction<{ id: string; blob: Blob }>,
    ) {
      audioSourceEntityAdapter.addOne(state, {
        id: action.payload.id,
        state: AudioSourceState.CREATED,
        durationMs: null,
      });
    },
    audioSourceReady(
      state,
      action: PayloadAction<{ id: string; durationMs: number }>,
    ) {
      audioSourceEntityAdapter.updateOne(state, {
        id: action.payload.id,
        changes: {
          state: AudioSourceState.READY,
          durationMs: action.payload.durationMs,
        },
      });
    },
    audioSourceEnded(state, action: PayloadAction<string>) {
      audioSourceEntityAdapter.updateOne(state, {
        id: action.payload,
        changes: { state: AudioSourceState.READY },
      });
    },
    playAudioSource(state, action: PayloadAction<string>) {
      audioSourceEntityAdapter.updateOne(state, {
        id: action.payload,
        changes: { state: AudioSourceState.PLAYING },
      });
    },
    stopAudioSource(state, action: PayloadAction<string>) {
      audioSourceEntityAdapter.updateOne(state, {
        id: action.payload,
        changes: { state: AudioSourceState.READY },
      });
    },
    destroyAudioSource(state, action: PayloadAction<string>) {
      audioSourceEntityAdapter.removeOne(state, action.payload);
    },
  },
});

const {
  createAudioSource,
  audioSourceReady,
  playAudioSource,
  stopAudioSource,
  destroyAudioSource,
  audioSourceEnded,
} = audioSourceSlice.actions;

function* playAudioSaga(
  player: Player,
  action: ReturnType<typeof playAudioSource | typeof stopAudioSource>,
) {
  if (stopAudioSource.match(action)) {
    player.stop();
    return;
  }

  yield call([player, player.play]);
  yield put(audioSourceEnded(action.payload));
}

function cancellableCreatePlayer(blob: Blob) {
  const abort = new AbortController();
  const promise = createEncodedPlayer(blob, abort.signal);
  (promise as SagaCancellablePromise<Player>)[CANCEL] = () => abort.abort();
  return promise;
}

function* audioPlayerSaga(action: ReturnType<typeof createAudioSource>) {
  const { id, blob } = action.payload;
  const player: Player = yield call(cancellableCreatePlayer, blob);
  yield put(audioSourceReady({ id, durationMs: player.durationMs }));
  const isPlayerAction = isAnyOf(playAudioSource, stopAudioSource);
  const predicate = (action: Action) =>
    isPlayerAction(action) && action.payload === id;
  try {
    yield join(yield takeLatest(predicate, playAudioSaga, player));
  } finally {
    if ((yield cancelled()) as boolean) {
      player.destroy();
    }
  }
}

function* audioSourceSaga() {
  const players = new Map<string, Task>();
  const predicate = isAnyOf(createAudioSource, destroyAudioSource);
  for (;;) {
    const action: GuardedType<typeof predicate> = yield take(predicate);
    if (createAudioSource.match(action) && !players.has(action.payload.id)) {
      players.set(action.payload.id, yield fork(audioPlayerSaga, action));
    } else if (
      destroyAudioSource.match(action) &&
      players.has(action.payload)
    ) {
      yield cancel(players.get(action.payload)!);
      players.delete(action.payload);
    }
  }
}

const audioSourceSelectors = audioSourceEntityAdapter.getSelectors<RootState>(
  (state) => state.audioSources,
);

export const selectIsAnyAudioSourcePlaying = createSelector(
  // Is this ok without bind?
  [audioSourceSelectors.selectAll],
  (allSources) => allSources.some((s) => s.state === AudioSourceState.PLAYING),
);

export const isSourceLoading = (source: AudioSource) =>
  source.state === AudioSourceState.CREATED ||
  source.state === AudioSourceState.LOADING;

export const selectAudioSourceById = audioSourceSelectors.selectById;

export {
  createAudioSource,
  playAudioSource,
  stopAudioSource,
  destroyAudioSource,
};

export { audioSourceSaga };

const audioSourceReducer = audioSourceSlice.reducer;

export default audioSourceReducer;
