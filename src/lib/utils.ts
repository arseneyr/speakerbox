import {
  BehaviorSubject,
  defer,
  EMPTY,
  firstValueFrom,
  from,
  MonoTypeOperatorFunction,
  Observable,
  ObservableInput,
  ObservableLike,
  ObservedValueOf,
  Observer,
  pipe,
  ReplaySubject,
  Subject,
  SubjectLike,
  Subscribable,
  Subscription,
} from "rxjs";
import type { ConnectableObservableLike } from "rxjs/internal/observable/connectable";
import type { ShareConfig } from "rxjs/internal/operators/share";
import type { ShareReplayConfig } from "rxjs/internal/operators/shareReplay";
import {
  catchError,
  distinctUntilChanged,
  finalize,
  first,
  map,
  mergeAll,
  share,
  shareReplay,
  switchAll,
  take,
  takeLast,
  takeUntil,
  window,
} from "rxjs/operators";
import {
  Readable,
  readable,
  StartStopNotifier,
  Subscriber,
  Unsubscriber,
  Writable,
  writable,
} from "svelte/store";

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
    cancel$?: Observable<unknown>
  ): Observable<T> {
    const outputSubject = new ReplaySubject<T>();

    const cancelSignal$ = cancel$
      ? cancel$.pipe(take(1), shareReplay(1))
      : EMPTY;

    const cancelSub = cancelSignal$.subscribe();

    this._queue.next(
      input$.pipe(
        takeUntil(cancelSignal$),
        share({ connector: () => outputSubject }),
        catchError(() => EMPTY)
      )
    );
    return outputSubject.pipe(
      takeUntil(cancelSignal$),
      finalize(() => cancelSub.unsubscribe())
    );
  }
}

export function toggleEmit<T>(
  notifier: Observable<unknown>
): MonoTypeOperatorFunction<T> {
  return pipe(
    window(notifier),
    map((window$, i) => (i % 2 === 0 ? window$.pipe(takeLast(1)) : window$)),
    mergeAll()
  );
}

export function rxWritable<T>(
  subject: BehaviorSubject<T>,
  transform?: MonoTypeOperatorFunction<T>
): Writable<T> {
  const obs = transform ? subject.pipe(transform) : subject;
  return {
    subscribe: obs.subscribe.bind(obs),
    set: subject.next.bind(subject),
    update: (cb) => subject.next(cb(subject.value)),
  };
}

export function lazySharedSwitch<O extends ObservableInput<any>>(
  connector: () => SubjectLike<ObservedValueOf<O>> = () => new Subject()
): (input: Observable<O>) => ConnectableObservableLike<ObservedValueOf<O>> {
  return (observable) => {
    const resettableSubject$ = new BehaviorSubject<
      ObservableInput<ObservedValueOf<O>>
    >(EMPTY);
    let outputSubject$;

    const connect = () => {
      outputSubject$ = connector();
      return observable.subscribe(resettableSubject$);
    };

    return Object.assign(
      resettableSubject$.pipe(
        finalize(() => resettableSubject$.next(EMPTY)),
        switchAll(),
        distinctUntilChanged(),
        share({
          connector: () => outputSubject$,
        })
      ),
      { connect }
    );
  };
}

export function memoizeInner<T>(): MonoTypeOperatorFunction<Observable<T>> {
  return pipe(map((inner$) => inner$.pipe(shareReplay<T>())));
}

/**
 * Creates a higher-order replay subject that only constructs the inner
 * observable when it is subscribed to, and saves the results to be replayed on
 * an further subscription. The outer observable is a ReplaySubject(1) and will
 * save the most recent memoized inner observable.
 */
// export class MemoizedDeferredSubject<T> extends Observable<Observable<T>> {
//   private readonly _subject = new Subject<Observable<T>>();
//   // private readonly _output$;

//   constructor(...args: Parameters<typeof shareReplay>) {
//     super();
//     return Object.assign(
//       this._subject.pipe(
//         map((inner$) => inner$.pipe(shareReplay())),
//         shareReplay(...args)
//       ),
//       this
//     );
//   }
//   // public subscribe(
//   //   ...args: Parameters<Subscribable<Observable<T>>["subscribe"]>
//   // ): Subscription {
//   //   return this._output$.subscribe(...args);
//   // }
//   public next(factory: () => ObservableInput<T>): void {
//     this._subject.next(defer(factory));
//   }
//   public complete(): void {
//     this._subject.complete();
//   }
//   public error(err: unknown): void {
//     this._subject.error(err);
//   }
// }

export type DeferredReplaySubject<T> = Observer<() => ObservableInput<T>> &
  Observable<Observable<T>>;

// export function MemoizedDeferredSubject<T>(this: MemoizedDeferredSubject<T>) {
//   return new Subject().pipe(
//     map((factory: () => ObservableInput<T>) => shareReplay()(defer(factory))),

//     shareReplay(1)
//   ) as MemoizedDeferredSubject<T>;
// }

export const DeferredReplaySubject = (function <T>(
  this: DeferredReplaySubject<T>,
  ...args: Parameters<typeof shareReplay>
) {
  return new Subject().pipe(
    map((factory: () => ObservableInput<T>) => shareReplay()(defer(factory))),
    shareReplay(...((args.length ? args : [1]) as any))
  );
} as unknown) as new <T>(
  ...args: Parameters<typeof shareReplay>
) => DeferredReplaySubject<T>;

// const p = new MemoizedDeferredSubject();
