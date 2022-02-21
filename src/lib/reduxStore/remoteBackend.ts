import {
  createAction,
  createAsyncThunk,
  createSlice,
  type AnyAction,
  type AsyncThunkPayloadCreator,
  type PayloadAction,
  type ThunkAction,
} from "@reduxjs/toolkit";
import type { RootState } from "./store";
import backends from "$lib/backend";
import { MainState, REMOTE_STATE_KEY } from "$lib/types";
import { getOrElse, getOrElseW } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

type RemoteBackendType = keyof typeof backends;

interface RemoteBackendSignedIn {
  type: RemoteBackendType;
  userId: string;
}

type RemoteBackendState = RemoteBackendSignedIn | undefined;

const signInInternal = createAction<RemoteBackendSignedIn>(
  "remoteBackend/signIn"
);
const signOut = createAction("remoteBackend/signOut");

function signIn(
  payload: RemoteBackendSignedIn
): ThunkAction<void, unknown, never, AnyAction> {
  return (dispatch) => {
    dispatch(signInInternal(payload));
    dispatch(fetchRemoteState());
  };
}

const fetchRemoteState = createAsyncThunk(
  "remoteBackend/fetchRemoteState",
  async (_, thunkAPI) => {
    const backendType = (
      thunkAPI.getState() as { remoteBackend: RemoteBackendState }
    ).remoteBackend?.type;
    if (!backendType) {
      throw new Error("Not signed in!");
    }
    return pipe(
      MainState.decode(await backends[backendType].getState(REMOTE_STATE_KEY)),
      getOrElseW(() => null)
    );
  }
);

function remoteBackendReducer(
  state: RemoteBackendState = undefined,
  action: AnyAction
): RemoteBackendState {
  if (signInInternal.match(action)) {
    return action.payload;
  } else if (signOut.match(action)) {
    return undefined;
  }
  return state;
}

export { remoteBackendReducer, signIn, signOut, fetchRemoteState };
