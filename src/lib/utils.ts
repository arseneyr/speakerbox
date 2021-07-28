import {
  EMPTY,
  firstValueFrom,
  iif,
  Observable,
  ReplaySubject,
  Subject,
} from "rxjs";
import {
  catchError,
  first,
  mergeAll,
  share,
  take,
  takeUntil,
} from "rxjs/operators";
import {
  derived,
  Readable,
  readable,
  StartStopNotifier,
  Subscriber,
  Writable,
  writable,
} from "svelte/store";
import type { Player } from "./types";

export function persistantWritable<T>(
  init: T,
  persist: (val: T) => Promise<unknown>
): Writable<T> & { saved: Promise<void> } {
  const store = writable(init) as Writable<T> & { saved: Promise<void> };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  store.subscribe((v) => (store.saved = persist(v).then(() => {})));
  return store;
}

interface HandlerElement {
  handler: () => void | (() => void);
  unsub?: () => void;
}

type PrivateWritable<T> = Readable<T> & {
  _set: Writable<T>["set"];
};

export function privateWritable<T>(
  value: T,
  start?: StartStopNotifier<T>
): PrivateWritable<T> {
  const ret = writable(value, start) as Writable<T> & {
    _set: Writable<T>["set"];
  };

  Object.defineProperty(
    ret,
    "_set",
    Object.getOwnPropertyDescriptor(ret, "set")
  );
  delete ret["set"];
  return ret;
}

export class Deferred<T> {
  private readonly _promise: Promise<T>;
  private _resolve!: (value?: T | PromiseLike<T>) => void;
  private _reject!: (reason?: any) => void;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get promise(): Promise<T> {
    return this._promise;
  }

  resolve = (value?: T | PromiseLike<T>): void => {
    this._resolve(value);
  };

  reject = (reason?: any): void => {
    this._reject(reason);
  };
}

export function privateReadable<T>(init?: T) {
  const ret = {
    _val: init,
    _setter: null as null | Subscriber<T | undefined>,
    get val() {
      return this._val;
    },
    set val(newVal) {
      this._val = newVal;
      this._setter?.(newVal);
    },
    _handlers: new Set<HandlerElement>(),
    onSubscribe(handler: () => void | (() => void)) {
      const h: HandlerElement = { handler, unsub: undefined };
      this._handlers.add(h);
      if (this._setter) {
        h.unsub = handler() || undefined;
      }
      return () => this._handlers.delete(h);
    },
  };
  const newReadable = readable<T | undefined>(init, (set) => {
    ret._setter = set;
    set(ret._val);
    ret._handlers.forEach((h) => {
      h.unsub = h.handler() || undefined;
    });
    return () => {
      ret._setter = null;
      ret._handlers.forEach((h) => {
        h.unsub?.();
        delete h.unsub;
      });
    };
  });
  return Object.assign(ret, newReadable);
}

function isTruthy<T>(val: T): val is NonNullable<T> {
  return Boolean(val);
}

export function waitForValue<T>(
  store: Readable<T> | Observable<T>,
  predicate = isTruthy
): Promise<NonNullable<T>> {
  if (store instanceof Observable) {
    return firstValueFrom(store.pipe(first(predicate)));
  }
  return new Promise((resolve) => {
    const unsub = store.subscribe((val) => {
      if (predicate(val)) {
        unsub();
        resolve(val);
      }
    });
  });
}

export class ObservableQueue {
  private readonly _queue = new Subject();

  constructor(concurrency = 1) {
    this._queue.pipe(mergeAll(concurrency)).subscribe();
  }

  public add<T>(
    input$: Observable<T>,
    cancel$: Observable<unknown> = EMPTY
  ): Observable<T> {
    let cancelled = false;
    const subject = new ReplaySubject<T>();

    cancel$.pipe(take(1)).subscribe(() => {
      cancelled = true;
    });

    this._queue.next(
      iif(() => cancelled, EMPTY, input$.pipe(takeUntil(cancel$))).pipe(
        share({ connector: () => subject }),
        catchError(() => EMPTY)
      )
    );
    return subject;
  }
}

interface SimplePlayer {
  playing: Readable<boolean>;
}

export function createAnyPlayingStore(): Readable<boolean> & {
  add(player: Readable<SimplePlayer | null>);
  delete(player: Readable<SimplePlayer>);
} {
  // setStore: Readable<Set<Readable<{ playing: Readable<boolean> } | null>>>
  const setStore = writable(
    new Set<Readable<{ playing: Readable<boolean> } | null>>()
  );
  return Object.assign(
    derived<typeof setStore, boolean>(setStore, (playerSet, s1) =>
      derived(
        Array.from(playerSet) as any,
        (players: (SimplePlayer | null)[], s2) =>
          derived(
            players.filter((p) => p).map((p) => p.playing) as any,
            (playing: boolean[]) => playing.some((v) => v)
          ).subscribe(s2)
      ).subscribe(s1)
    ),
    {
      add(player: Readable<SimplePlayer | null>) {
        setStore.update((set) => set.add(player));
      },
      delete(player: Readable<SimplePlayer>) {
        setStore.update((set) => (set.delete(player), set));
      },
    }
  );
}
