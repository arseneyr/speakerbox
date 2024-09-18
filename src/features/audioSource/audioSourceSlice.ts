import {
  PayloadAction,
  createEntityAdapter,
  createSelector,
  createSlice,
  isAnyOf,
} from "@reduxjs/toolkit";

import { Player, createEncodedPlayer } from "./player";
import { uuid } from "@common/utils";
import { RootState } from "@app/store";
import { finishRehydrate } from "@features/persist/persistor";
import { del, getMany, set } from "idb-keyval";
import {
  AppStartListening,
  forkWithCancelAction,
} from "@app/listenerMiddleware";

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

// Listener

export const startAudioSourceListener = (
  appStartListening: AppStartListening,
) => {
  const playerMap = new Map<string, Player>();

  const playerActionMatcher = isAnyOf(
    playAudioSource,
    stopAudioSource,
    destroyAudioSource,
  );

  const startPlayerListener = (id: string) =>
    appStartListening({
      predicate: (action) =>
        playerActionMatcher(action) && action.payload === id,
      effect: async (action, listenerAPI) => {
        listenerAPI.cancelActiveListeners();
        if (destroyAudioSource.match(action)) {
          return;
        }
        const player = playerMap.get(id);
        if (!player) {
          return;
        }
        if (stopAudioSource.match(action)) {
          player.stop();
          return;
        }
        await listenerAPI.pause(player.play());
        listenerAPI.dispatch(audioSourceEnded(id));
      },
    });

  appStartListening({
    actionCreator: createAudioSource,
    effect: async (action, listenerAPI) => {
      const { id, blob } = action.payload;
      const createTask = forkWithCancelAction(listenerAPI)(
        (action) => destroyAudioSource.match(action) && action.payload === id,
        ({ pause, signal }) => pause(createEncodedPlayer(blob, signal)),
      );
      const result = await createTask.result;
      if (result.status === "ok") {
        const player = result.value;
        playerMap.set(id, player);
        listenerAPI.dispatch(
          audioSourceReady({ id, durationMs: player.durationMs }),
        );
        startPlayerListener(id);
      } else if (result.status === "rejected") {
        listenerAPI.dispatch(errorAudioSource(id));
      }
    },
  });

  appStartListening({
    actionCreator: destroyAudioSource,
    effect: ({ payload: id }) => {
      playerMap.get(id)?.stop();
      playerMap.delete(id);
      del(id);
    },
  });

  appStartListening({
    actionCreator: finishRehydrate,
    effect: async (rehydrateAction, listenerAPI) => {
      listenerAPI.unsubscribe();
      const ids = rehydrateAction.payload.audioSources ?? [];
      const loadedSources: unknown[] = ids.length ? await getMany(ids) : [];

      loadedSources.forEach((blob, i) =>
        listenerAPI.dispatch(
          blob instanceof Blob
            ? createAudioSource({ id: ids[i], blob })
            : errorAudioSource(ids[i]),
        ),
      );
    },
  });
};

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

// Reducer
export const audioSourceReducer = audioSourceSlice.reducer;
