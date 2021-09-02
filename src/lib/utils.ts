import {
  derived,
  Readable,
  readable,
  StartStopNotifier,
  Subscriber,
  Writable,
  writable,
} from "svelte/store";
import externalAssert from "assert";

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
  _update: Writable<T>["update"];
  _val: T;
};

function privateWritable<T>(
  value: T,
  start?: StartStopNotifier<T>
): PrivateWritable<T> {
  const ret = writable(value, start);

  Object.defineProperties(ret, {
    _set: Object.getOwnPropertyDescriptor(ret, "set"),
    _update: Object.getOwnPropertyDescriptor(ret, "update"),
    _val: {
      get: () => {
        let val;
        ret.update((v) => (val = v));
        return val;
      },
    },
  });

  delete ret["set"];
  delete ret["update"];
  return (ret as unknown) as PrivateWritable<T>;
}

class Deferred<T> {
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

type SpiedStore<
  T,
  S extends Readable<T> | Writable<T> | PrivateWritable<T>
> = S & { _val: T };

function spyOnStore<
  T,
  S extends Readable<T> | Writable<T> | PrivateWritable<T>
>(initialValue: T, store: S): SpiedStore<T, S> {
  let val = initialValue;
  const oldSubscribe = store.subscribe.bind(store);
  const newSubscribe = {
    subscribe: { value: (fn) => oldSubscribe((v) => ((val = v), fn(v))) },
  };
  const oldUpdate =
    "update" in store
      ? store.update.bind(store)
      : "_update" in store
      ? store._update.bind(store)
      : null;
  const newUpdate =
    "update" in store
      ? { update: { value: (fn) => oldUpdate((v) => (val = fn(v))) } }
      : "_update" in store
      ? { _update: { value: (fn) => oldUpdate((v) => (val = fn(v))) } }
      : false;

  const oldSet =
    "set" in store
      ? store.set.bind(store)
      : "_set" in store
      ? store._set.bind(store)
      : null;
  const newSet =
    "set" in store
      ? { set: { value: (v) => ((val = v), oldSet(v)) } }
      : "_set" in store
      ? { _set: { value: (v) => ((val = v), oldSet(v)) } }
      : false;

  return Object.defineProperties(store, {
    _val: { get: () => val },
    ...newSubscribe,
    ...newUpdate,
    ...newSet,
  }) as S & { _val: T };
}

function isTruthy<T>(val: T): val is NonNullable<T> {
  return Boolean(val);
}

function waitForValue<T>(
  store: Readable<T>,
  predicate = isTruthy
): Promise<NonNullable<T>> {
  return new Promise((resolve) => {
    let firstTime = true;
    const unsub = store.subscribe((val) => {
      if (predicate(val)) {
        if (firstTime) {
          firstTime = false;
        } else {
          unsub();
        }
        resolve(val);
      }
    });
    if (!firstTime) {
      unsub();
    }
    firstTime = false;
  });
}

function assert(condition: unknown, message?: string): asserts condition {
  if (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    !import.meta.env.PROD
  ) {
    externalAssert(condition, message);
  } else {
    console.error(`Assertion failed: ${message ?? ""}`);
    console.trace();
  }
}

export { privateWritable, Deferred, spyOnStore, waitForValue, assert };
export type { SpiedStore };
