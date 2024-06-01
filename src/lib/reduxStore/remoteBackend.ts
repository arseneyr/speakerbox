import {
  createAsyncThunk,
  createSlice,
  type AnyAction,
  type Middleware,
  type PayloadAction,
  type ThunkAction,
  type ThunkDispatch,
} from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "./store";
import backends from "$lib/backend";
import {
  MainState,
  MergeableMainState,
  REMOTE_STATE_KEY,
  RetryError,
} from "$lib/types";
import { getOrElseW } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { mergeableClone, mergeableHasChanged } from "./automerge";

type RemoteBackendType = keyof typeof backends;

interface RemoteBackendSignedIn {
  type: RemoteBackendType;
  userId: string;
}

interface RemoteBackendState {
  signedIn: RemoteBackendSignedIn | null;
  remoteState: MergeableMainState;
  uploading: boolean;
}

const initialState: RemoteBackendState = {
  signedIn: null,
  uploading: false,
};

// function signIn(payload: RemoteBackendSignedIn) {
//   return (dispatch: AppDispatch) => {
//     dispatch(signInInternal(payload));
//     dispatch(fetchRemoteState());
//   };
// }

function signOut(): ThunkAction<void, RootState, void, AnyAction> {
  return (dispatch, getState) => {};
}

const signIn = createAsyncThunk<
  void,
  RemoteBackendSignedIn,
  { state: RootState }
>("remoteBackend/signIn", async (payload, { dispatch, getState }) => {
  dispatch(signInInternal(payload));
  const remoteState = await dispatch(fetchRemoteState()).unwrap();
  if (remoteState === null) {
    const newState = mergeableClone(getState().samples.savedState);
  }
});

const fetchRemoteState = createAsyncThunk<
  MainState | null,
  void,
  { state: RootState }
>("remoteBackend/fetchRemoteState", async (_, thunkAPI) => {
  const backendType = thunkAPI.getState().remoteBackend.signedIn?.type;
  if (!backendType) {
    throw new Error("Not signed in!");
  }
  return pipe(
    MainState.decode(await backends[backendType].getState(REMOTE_STATE_KEY)),
    getOrElseW(() => null)
  );
});

const uploadRemoteState = createAsyncThunk<void, void, { state: RootState }>(
  "remoteBackend/uploadRemoteState",
  async (_, { dispatch, getState }) => {
    try {
      dispatch(startUpload());
      let prevState = null;
      let backendType = null;
      while (prevState !== getState().samples.savedState) {
        prevState = getState().samples.savedState;
        backendType ??= getState().remoteBackend.signedIn?.type;
        if (!backendType) {
          throw new Error("Uploading remote state while logged out");
        }
        try {
          await backends[backendType].setState(
            REMOTE_STATE_KEY,
            MergeableMainState.encode(getState().samples.savedState)
          );
        } catch (err) {
          if (!(err instanceof RetryError)) {
            throw err;
          }
        }
        await dispatch(fetchRemoteState()).unwrap();
      }
    } finally {
      dispatch(finishUpload());
    }
  }
);

const syncMiddleware: Middleware<
  Record<string, never>,
  RootState,
  ThunkDispatch<RootState, void, AnyAction>
> =
  ({ getState, dispatch }) =>
  (next) =>
  (action) => {
    const prevState = getState();
    const res = next(action);
    const state = getState();
    if (
      !state.remoteBackend.uploading &&
      state.remoteBackend.signedIn !== null &&
      mergeableHasChanged(
        prevState.samples.savedState,
        state.samples.savedState
      )
    ) {
      dispatch(uploadRemoteState());
    }
    return res;
  };

const remoteBackendSlice = createSlice({
  name: "remoteBackend",
  initialState,
  reducers: {
    signInInternal(state, action: PayloadAction<RemoteBackendSignedIn>) {
      state.signedIn = action.payload;
    },
    signOutInternal(state) {
      state.signedIn = null;
    },
    startUpload(state) {
      state.uploading = true;
    },
    finishUpload(state) {
      state.uploading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRemoteState.fulfilled, (state) => {});
  },
});

const { signInInternal, signOutInternal, startUpload, finishUpload } =
  remoteBackendSlice.actions;

export default remoteBackendSlice.reducer;
export { signIn, signOut, fetchRemoteState, syncMiddleware };
