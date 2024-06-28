import { call, put, select, take } from "redux-saga/effects";
import { getMany, setMany } from "idb-keyval";
import {
  PayloadAction,
  Reducer,
  UnknownAction,
  createSlice,
} from "@reduxjs/toolkit";
import { RootState } from "@app/store";
import {
  persistAudioSources,
  rehydrateAudioSources,
} from "@features/audioSource/audioSourceSlice";
import { persistSamples, rehydrateSamples } from "@features/sample/sampleSlice";

type PersistState = {
  rehydrated: boolean | null;
};

type PersistorSlice<S, R> = {
  persist: (rootState: S) => R;
  rehydrate?: (input: unknown) => R | null;
};

type PersistorSlices<S> = Record<string, PersistorSlice<S, unknown>>;

type PersistorOptions<S, PS extends PersistorSlices<S>> = {
  persistSlices: PS;
  prefix?: string;
};

type RehydrateActionPayload<S, PS extends PersistorSlices<S>> = {
  [K in keyof PS]: ReturnType<Exclude<PS[K]["rehydrate"], undefined>>;
};

function createPersistor<S, PS extends PersistorSlices<S>>(
  options: PersistorOptions<S, PS>,
) {
  const { prefix = "sb", persistSlices } = options;

  const persistSlice = createSlice({
    name: "persist",
    initialState: { rehydrated: null } as PersistState,
    reducers: {
      startRehydrate(state) {
        state.rehydrated = false;
      },
      finishRehydrate(
        state,
        _action: PayloadAction<RehydrateActionPayload<S, typeof persistSlices>>,
      ) {
        state.rehydrated = true;
      },
    },
  });
  const { startRehydrate, finishRehydrate } = persistSlice.actions;

  function pick(rootState: S) {
    return Object.fromEntries(
      Object.entries(persistSlices).map(([k, s]) => [k, s.persist(rootState)]),
    );
  }

  function* rehydrateSaga() {
    const persistKeys = Object.keys(persistSlices);
    const vals: unknown[] = yield call(
      getMany,
      persistKeys.map((k) => `${prefix}-${k}`),
    );
    const validatedPayload = Object.fromEntries(
      persistKeys.map((k, i) => [
        k,
        persistSlices[k].rehydrate?.(vals[i]) ?? null,
      ]),
    ) as RehydrateActionPayload<S, typeof persistSlices>;
    const finishedAction = finishRehydrate(validatedPayload);
    yield put(finishedAction);
    return (yield select()) as S;
  }

  function* persistSaga() {
    const initState: S = yield select();
    let oldState = pick(initState);
    for (;;) {
      const action: UnknownAction = yield take("*");
      if (startRehydrate.match(action)) {
        const newState: S = yield call(rehydrateSaga);
        oldState = pick(newState);
        continue;
      }
      const state: S = yield select();
      const setArray: [string, unknown][] = [];
      for (const [key, { persist }] of Object.entries(persistSlices)) {
        const newState = persist(state);
        if (oldState[key] === newState) {
          continue;
        }
        oldState[key] = newState;
        setArray.push([`${prefix}-${key}`, newState]);
      }
      setArray.length && setMany(setArray).catch(console.error);
    }
  }

  return {
    saga: persistSaga,
    reducer: persistSlice.reducer as Reducer<PersistState>,
    actions: persistSlice.actions,
  };
}

const persistSlices = {
  audioSources: {
    persist: persistAudioSources,
    rehydrate: rehydrateAudioSources,
  },
  samples: {
    persist: persistSamples,
    rehydrate: rehydrateSamples,
  },
} satisfies PersistorSlices<RootState>;

const persistor = createPersistor<RootState, typeof persistSlices>({
  persistSlices,
});

const persistReducer: Reducer<PersistState> = persistor.reducer;
const persistSaga = persistor.saga;

export { persistReducer, persistSaga };

export const { startRehydrate, finishRehydrate } = persistor.actions;
