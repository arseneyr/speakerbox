import { AutomergeCodec, RetryError } from "$lib/types";
import {
  createAsyncThunk,
  isFulfilled,
  isPending,
  type AnyAction,
  type ListenerMiddleware,
  type Reducer,
  type ThunkDispatch,
  type TypedAddListener,
  type UnsubscribeListener,
} from "@reduxjs/toolkit";
import { addListener } from "@reduxjs/toolkit";
import type { ExtractDispatchExtensions } from "@reduxjs/toolkit/dist/tsHelpers";
import type { Doc } from "automerge";
import { getOrElseW } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import type { Type } from "io-ts";
import {
  mergeableChange,
  mergeableClone,
  mergeableDuplicate,
  mergeableHasChanged,
  mergeableInit,
  mergeableMerge,
} from "./automerge";

const PERSIST_REDUCER = Symbol();

interface RemoteState<S> {
  state: Doc<S> | null;
  syncing: number;
}
type PersistSlice<S> = Doc<S> & {
  [remoteState: symbol]: RemoteState<S>;
};

type PersistReducer<S> = Reducer<Doc<S>> & {
  [PERSIST_REDUCER]: (
    oldSlice: PersistSlice<S>,
    newSlice: PersistSlice<S>
  ) => void;
};

interface PersistOptions<State, Slice> {
  reducer:
    | (Reducer<Slice> & { [PERSIST_REDUCER]?: never })
    | PersistReducer<Slice>;
  selector: (state: State) => Slice;
  key: string;
  codec?: Type<Slice>;
}

interface IBackend {
  getKey(key: string): Promise<{ value: unknown; tag?: string } | null>;
  setKey(key: string, value: unknown, tag?: string): Promise<void>;
}

type ThunkAction<R, D, S> = (dispatch: D, getState: () => S) => R;

type DispatchRestrictions<State> = ExtractDispatchExtensions<
  [ListenerMiddleware]
> &
  ThunkDispatch<State, void, AnyAction>;

interface PersistActions<State> {
  start(
    backend: IBackend
  ): ThunkAction<Promise<void>, DispatchRestrictions<State>, State>;
  poll(): ThunkAction<Promise<void>, DispatchRestrictions<State>, State>;
  flush(): ThunkAction<Promise<void>, DispatchRestrictions<State>, State>;
  stop(): ThunkAction<Promise<void>, DispatchRestrictions<State>, State>;
}

interface PersistReturn<State, Slice> {
  reducer: PersistReducer<Slice>;
  actions: PersistActions<State>;
}

function toAutomergeReducer<S extends Record<string, unknown>>(
  reducer: (state: S | undefined, action: AnyAction) => S | void
): Reducer<Doc<S>> {
  return (state, action) => {
    if (state === undefined) {
      return mergeableInit(reducer(state, action) as S);
    }
    return mergeableChange(state, (s) => reducer(s, action));
  };
}

function persist<State, Slice extends Record<string, unknown>>(
  options: PersistOptions<State, Slice>
): PersistReturn<State, Slice> {
  const { reducer, key } = options;
  const codec = AutomergeCodec(options.codec);
  const REMOTE_STATE = Symbol(`REMOTE_STATE_${key}`);

  const remoteSelector = (state: State) =>
    (options.selector(state) as PersistSlice<Slice>)[REMOTE_STATE];
  const copyRemoteStates = (
    oldSlice: PersistSlice<Slice>,
    newSlice: PersistSlice<Slice>
  ) => {
    reducer[PERSIST_REDUCER]?.(oldSlice, newSlice);
    Object.defineProperty(newSlice, REMOTE_STATE, {
      value: oldSlice[REMOTE_STATE],
    });
  };

  let backend: IBackend | null = null;
  let tag: string | undefined;

  function remoteStateHasChanged(
    currentState: State,
    previousState: State
  ): boolean {
    const currentRemoteState = remoteSelector(currentState).state;
    const originalRemoteState = remoteSelector(previousState).state;
    return (
      !!currentRemoteState &&
      (!originalRemoteState ||
        mergeableHasChanged(originalRemoteState, currentRemoteState))
    );
  }

  const fetchState = createAsyncThunk(`persist/fetch-${key}`, async () => {
    const res = await backend!.getKey(key);
    tag = res?.tag;
    return pipe(
      codec.decode(res?.value),
      getOrElseW(() => null)
    );
  });

  const upload = createAsyncThunk<void, void, { state: State }>(
    `persist/upload-${key}`,
    async (_, thunkApi) => {
      let previousState = thunkApi.getState();
      for (;;) {
        try {
          await backend!.setKey(
            key,
            codec.encode(remoteSelector(previousState).state!),
            tag
          );
          const currentState = thunkApi.getState();
          if (!remoteStateHasChanged(currentState, previousState)) {
            break;
          }
          previousState = currentState;
        } catch (err) {
          if (!(err instanceof RetryError)) {
            throw err;
          }
          await thunkApi.dispatch(fetchState());
        }
      }
    }
  );
  const isSyncStart = isPending(fetchState, upload);
  const isSyncFinish = isFulfilled(fetchState, upload);

  function remoteReducer(
    subReducer: Reducer<Doc<Slice>>
  ): Reducer<PersistSlice<Slice>> {
    return (state, action) => {
      let nextState = subReducer(state, action);
      const originalRemoteState = state?.[REMOTE_STATE].state ?? null;
      const originalSyncing = state?.[REMOTE_STATE].syncing ?? 0;
      let nextRemoteState = originalRemoteState;
      let nextSyncing = originalSyncing;
      if (fetchState.fulfilled.match(action)) {
        if (action.payload === null) {
          nextRemoteState = mergeableClone(nextState);
        } else {
          const newState = mergeableMerge(nextState, action.payload);
          reducer[PERSIST_REDUCER]?.(nextState, newState);
          nextState = newState;
          nextRemoteState = action.payload;
        }
      }
      if (isSyncStart(action)) {
        nextSyncing++;
      } else if (isSyncFinish(action)) {
        nextSyncing--;
      }
      if (nextState !== state) {
        nextRemoteState = nextRemoteState
          ? mergeableMerge(nextRemoteState, nextState)
          : null;
      }

      if (
        (nextRemoteState !== originalRemoteState ||
          nextSyncing !== originalSyncing) &&
        state === nextState
      ) {
        nextState = mergeableDuplicate(nextState);
        reducer[PERSIST_REDUCER]?.(state, nextState);
      }
      if (nextState !== state) {
        Object.defineProperty(nextState, REMOTE_STATE, {
          value: {
            state: nextRemoteState,
            syncing: nextSyncing,
          },
        });
      }
      return nextState;
    };
  }

  const typedAddListener = addListener as TypedAddListener<State>;
  let unsubListener: UnsubscribeListener;

  const waitForSync: ThunkAction<
    Promise<void>,
    DispatchRestrictions<void>,
    State
  > = (dispatch, getState) => {
    if (remoteSelector(getState()).syncing === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      dispatch(
        typedAddListener({
          predicate: (_, currentState) =>
            remoteSelector(currentState).syncing === 0,
          effect: (_, { unsubscribe }) => {
            unsubscribe();
            resolve();
          },
        })
      );
    });
  };

  const start: PersistActions<State>["start"] =
    (backendArg: IBackend) => (dispatch) => {
      backend = backendArg;
      unsubListener = dispatch(
        typedAddListener({
          predicate: (_, currentState, originalState) =>
            remoteStateHasChanged(currentState, originalState),
          effect: async (_, listenerApi) => {
            listenerApi.unsubscribe();
            await listenerApi.dispatch(upload());
            if (!listenerApi.signal.aborted) {
              listenerApi.subscribe();
            }
          },
        })
      );

      return dispatch(fetchState()).unwrap().then();
    };
  const flush: PersistActions<State>["flush"] = () => (dispatch) => {
    return dispatch(waitForSync);
  };
  const poll: PersistActions<State>["poll"] = () => async (dispatch) => {
    await dispatch(fetchState()).unwrap();
    return dispatch(waitForSync);
  };
  const stop: PersistActions<State>["stop"] = () => (dispatch) => {
    unsubListener({ cancelActive: true });
    return dispatch(flush());
  };

  const wrappedReducer = Object.defineProperty(
    remoteReducer(
      PERSIST_REDUCER in reducer
        ? (reducer as PersistReducer<Slice>)
        : toAutomergeReducer(reducer as Reducer<Slice>)
    ),
    PERSIST_REDUCER,
    { value: copyRemoteStates }
  ) as PersistReducer<Slice>;

  return {
    reducer: wrappedReducer,
    actions: { start, stop, poll, flush },
  };
}

export default persist;
