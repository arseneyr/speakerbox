import samples from "./samples";
import produce, { enablePatches, Patch, applyPatches } from "immer";
import Peer from "peerjs";
import { store as reduxStore, RootState, RemoteState } from "./index";
import {
  PayloadAction,
  Store,
  createAction,
  configureStore,
} from "@reduxjs/toolkit";
import { Deferred } from "../globalTypes";

enablePatches();

type Message =
  | PayloadAction<RootState["samples"], "initialState">
  | PayloadAction<Patch[], "statePatches">;

abstract class RemoteBase {
  protected readonly peer: Peer;
  private _conn!: Peer.DataConnection;

  constructor() {
    this.peer = new Peer({
      ...(process.env.NODE_ENV === "development" ? { debug: 3 } : {}),
      ...(process.env.REACT_APP_PEERJS_SERVER && {
        host: process.env.REACT_APP_PEERJS_SERVER,
      }),
    });

    this.peer.on("open", (id) => this.onPeerOpen(id));
    this.peer.on("connection", (conn) => (this.conn = conn));
  }

  protected readonly onPeerOpen = (id: string) => {};
  protected readonly onOpen = () => {};
  protected readonly send = (data: Message) => {
    this.conn?.send(data);
  };
  protected readonly onData: (data: Message) => void = () => {};
  protected set conn(c: Peer.DataConnection) {
    c.on("data", this.onData);
    c.on("open", this.onOpen);
    this._conn = c;
  }
  protected get conn() {
    return this._conn;
  }

  public destroy() {
    this.peer.destroy();
  }
}

export class RemoteServer extends RemoteBase {
  private readonly idDeferred: Deferred<string> = new Deferred();
  constructor(private readonly store: typeof reduxStore) {
    super();
  }

  protected readonly onPeerOpen = (id: string) => {
    this.idDeferred.resolve(id);
  };

  get id() {
    return this.idDeferred.promise;
  }

  protected readonly onOpen = () => {
    this.send({ type: "initialState", payload: this.store.getState().samples });
    onPatch = (patches) =>
      this.send({ type: "statePatches", payload: patches });
  };

  public destroy = () => {
    super.destroy();
    onPatch = null;
  };
}

export class RemoteClient extends RemoteBase {
  private _store?: Store<RemoteState>;
  private readonly _storeDeferred: Deferred<
    NonNullable<RemoteClient["_store"]>
  > = new Deferred();

  constructor(private readonly id: string) {
    super();
  }

  private static readonly applyDiff = createAction<Patch[]>("applyDiff");
  private readonly createStore = (preloadedState: RootState["samples"]) => {
    this._store = configureStore({
      reducer: {
        samples: (state = preloadedState, action) => {
          switch (action.type) {
            case RemoteClient.applyDiff.type: {
              return applyPatches(state, action.payload);
            }
          }
          return state;
        },
      },
    });
    this._storeDeferred.resolve(this._store);
  };

  public get store() {
    return this._storeDeferred.promise;
  }

  protected readonly onPeerOpen = () => {
    this.conn = this.peer.connect(this.id, { reliable: true });
  };

  protected readonly onData = (data: Message) => {
    switch (data.type) {
      case "initialState":
        this.createStore(data.payload);
        break;
      case "statePatches":
        this._store?.dispatch?.(RemoteClient.applyDiff(data.payload));
        break;
      default:
        console.error("Unrecognized message type!", data);
    }
  };
}

let onPatch: ((patches: Patch[]) => void) | null;

export function remoteSamplesReducer(
  samplesReducer: typeof samples
): typeof samples {
  return (state, action) =>
    onPatch === null
      ? samplesReducer(state, action)
      : produce(state, (draft) => samplesReducer(draft, action), onPatch);
}
