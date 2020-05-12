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
import { createContext, useContext } from "react";
import EventTarget from "@ungap/event-target";

enablePatches();

type ClientMessage =
  | PayloadAction<RootState["samples"], "initialState">
  | PayloadAction<Patch[], "statePatches">;
type ServerMessage =
  | PayloadAction<string, "play">
  | PayloadAction<string, "stop">;

abstract class RemoteBase {
  protected peer!: Peer;
  private _conn!: Peer.DataConnection;

  public connect() {
    this.peer = new Peer({
      ...(process.env.NODE_ENV === "development" ? { debug: 3 } : {}),
      ...(process.env.REACT_APP_PEERJS_SERVER && {
        host: process.env.REACT_APP_PEERJS_SERVER,
      }),
    });

    this.peer.on("open", this.onPeerOpen);
    this.peer.on("connection", (conn) => (this.conn = conn));
  }

  protected readonly onPeerOpen = (id: string) => {};
  protected readonly onOpen = () => {};
  protected readonly send = (data: any) => {
    this.conn?.send(data);
  };
  protected readonly onData: (data: any) => void = () => {};
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
  private readonly eventTarget: EventTarget = new EventTarget();
  constructor(private readonly store: typeof reduxStore) {
    super();
  }

  public get id() {
    return this.idDeferred.promise;
  }

  public readonly destroy = () => {
    super.destroy();
    onPatch = null;
  };

  public addHandler<T extends ServerMessage>(
    type: T["type"],
    handler: (payload: T["payload"]) => void
  ) {
    const cb = (event: Event) => handler((event as CustomEvent).detail);
    this.eventTarget.addEventListener(type, cb);

    return () => this.eventTarget.removeEventListener(type, cb);
  }

  protected readonly onData = (data: ServerMessage) => {
    switch (data.type) {
      case "play":
      case "stop":
        this.eventTarget.dispatchEvent(
          new CustomEvent(data.type, { detail: data.payload })
        );
        break;
      default:
        console.error("Unrecognized message type!", data);
    }
  };

  protected readonly onPeerOpen = (id: string) => {
    this.idDeferred.resolve(id);
  };

  protected readonly onOpen = () => {
    this.send({ type: "initialState", payload: this.store.getState().samples });
    onPatch = (patches) =>
      this.send({ type: "statePatches", payload: patches });
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

  public get store() {
    return this._storeDeferred.promise;
  }

  public readonly sendPlay = (id: string) => {
    this.send({ type: "play", payload: id });
  };

  public readonly sendStop = (id: string) => {
    this.send({ type: "stop", payload: id });
  };

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

  protected readonly onPeerOpen = () => {
    this.conn = this.peer.connect(this.id, { reliable: true });
  };

  protected readonly onData = (data: ClientMessage) => {
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

const context = createContext<RemoteClient | RemoteServer | null>(null);
export const RemoteProvider = context.Provider;
export const useRemote = () => useContext(context);

let onPatch: ((patches: Patch[]) => void) | null;

export function remoteSamplesReducer(
  samplesReducer: typeof samples
): typeof samples {
  return (state, action) =>
    onPatch === null
      ? samplesReducer(state, action)
      : produce(state, (draft) => samplesReducer(draft, action), onPatch);
}
