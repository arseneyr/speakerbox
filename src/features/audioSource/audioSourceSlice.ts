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
  fork,
  join,
  put,
  take,
  takeLatest,
} from "redux-saga/effects";
import { Player, createEncodedPlayer } from "./player";
import { CANCEL, Task } from "redux-saga";
import { GuardedType, SagaCancellablePromise, uuid } from "@common/utils";
import { RootState } from "@app/store";
import { finishRehydrate } from "@features/persist/persistor";
import { del, getMany, set } from "idb-keyval";

enum AudioSourceState {
  CREATED = "created",
  LOADING = "loading",
  READY = "ready",
  PLAYING = "playing",
  ERROR = "error",
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
        state: AudioSourceState.LOADING,
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
    errorAudioSource(state, action: PayloadAction<string>) {
      audioSourceEntityAdapter.upsertOne(state, {
        id: action.payload,
        state: AudioSourceState.ERROR,
        durationMs: null,
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(finishRehydrate, (state, action) => {
      action.payload.audioSources &&
        audioSourceEntityAdapter.setAll(
          state,
          action.payload.audioSources.map((id) => ({
            id,
            state: AudioSourceState.LOADING,
            durationMs: null,
          })),
        );
    });
  },
});

const {
  createAudioSource,
  audioSourceReady,
  playAudioSource,
  stopAudioSource,
  destroyAudioSource,
  audioSourceEnded,
  errorAudioSource,
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

function* rehydrateSaga(action: ReturnType<typeof finishRehydrate>) {
  const ids = action.payload.audioSources ?? [];
  const loadedSources: unknown[] = ids.length ? yield call(getMany, ids) : [];

  for (const [i, s] of loadedSources.entries()) {
    const id = ids[i];
    yield put(
      s instanceof Blob
        ? createAudioSource({ id, blob: s })
        : errorAudioSource(id),
    );
  }
}

function* audioSourceSaga() {
  yield fork(rehydrateSaga, yield take(finishRehydrate.type));

  const players = new Map<string, Task>();
  const predicate = isAnyOf(createAudioSource, destroyAudioSource);
  for (;;) {
    const action: GuardedType<typeof predicate> = yield take(predicate);
    if (createAudioSource.match(action) && !players.has(action.payload.id)) {
      players.set(action.payload.id, yield fork(audioPlayerSaga, action));
      yield fork(set, action.payload.id, action.payload.blob);
    } else if (destroyAudioSource.match(action)) {
      const id = action.payload;
      const task = players.get(id);
      task && ((yield cancel(task)) as unknown);
      players.delete(id);
      yield fork(del, id);
    }
  }
}

export function generateAudioSourceId() {
  return uuid();
}

// Persist
export function persistAudioSources(rootState: RootState) {
  return rootState.audioSources.ids;
}

export function rehydrateAudioSources(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }
  return input;
}

// Selectors
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

export const isSourceErrored = (source: AudioSource) =>
  source.state === AudioSourceState.ERROR;

export const selectAudioSourceById = audioSourceSelectors.selectById;

// Actions
export {
  createAudioSource,
  playAudioSource,
  stopAudioSource,
  destroyAudioSource,
};

// Saga
export { audioSourceSaga };

// Reducer
export const audioSourceReducer = audioSourceSlice.reducer;
