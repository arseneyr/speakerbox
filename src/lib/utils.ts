import type {
  Readable,
  StartStopNotifier,
  Unsubscriber,
  Writable,
} from "svelte/store";
import { derived, writable } from "svelte/store";
import externalAssert, { AssertionError } from "assert";
import {
  addListener,
  type AnyAction,
  type Reducer,
  type ThunkAction,
} from "@reduxjs/toolkit";
import type { BaseActionCreator } from "@reduxjs/toolkit/dist/createAction";
import type { TypedActionCreator } from "@reduxjs/toolkit/dist/listenerMiddleware/types";

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export function persistantWritable<T>(
  init: T,
  persist: (val: T) => Promise<unknown>
): Writable<T> & { saved: Promise<void> } {
  const store = writable(init) as Writable<T> & { saved: Promise<void> };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  store.subscribe((v) => (store.saved = persist(v).then(() => {})));
  return store;
}

type PrivateWritable<T> = Readable<T> & {
  _set: Writable<T>["set"];
  _update: Writable<T>["update"];
  _val: T;
};

function privateWritable<T>(
  value?: T,
  start?: StartStopNotifier<T>
): PrivateWritable<T> {
  const ret = writable(value, start);

  const originalSet = ret.set;
  // const originalUpdate = ret.update;
  delete (ret as any)["set"];
  delete (ret as any)["update"];

  Object.defineProperties(ret, {
    _set: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: (v: T) => {
        value = v;
        originalSet(v);
      },
    },
    _update: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: (updateFn: (v?: T) => T) => {
        const newValue = updateFn(value);
        if (!Object.is(newValue, value)) {
          value = newValue;
          originalSet(value);
        }
      },
    },
    _val: {
      get: () => value,
    },
  });

  // delete ret["set"];
  // delete ret["update"];
  return ret as unknown as PrivateWritable<T>;
}

class Deferred<T> {
  private readonly _promise: Promise<T>;
  private _resolve!: (value: T | PromiseLike<T>) => void;
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

  resolve = (value: T | PromiseLike<T>): void => {
    this._resolve(value);
  };

  reject = (reason?: unknown): void => {
    this._reject(reason);
  };
}

function isTruthy<T>(val: T): val is NonNullable<T> {
  return Boolean(val);
}

function waitForValue<T extends null>(
  store: Readable<T>,
  predicate?: (val: T) => val is NonNullable<T>
): Promise<NonNullable<T>>;
function waitForValue<T>(
  store: Readable<T>,
  predicate?: (val: T) => boolean
): Promise<T>;
function waitForValue<T>(
  store: Readable<T>,
  predicate: (val: T) => boolean = isTruthy
): Promise<T> {
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
    externalAssert(
      condition,
      new AssertionError({
        message,
        expected: true,
        actual: condition,
        operator: "==",
        stackStartFn: assert,
      })
    );
  } else {
    console.error(`Assertion failed: ${message ?? ""}`);
    console.trace();
  }
}

type Stores =
  | Readable<any>
  | [Readable<any>, ...Array<Readable<any>>]
  | Array<Readable<any>>;
type StoresValues<T> = T extends Readable<infer U>
  ? U
  : {
      [K in keyof T]: T[K] extends Readable<infer U> ? U : never;
    };

function memoizedDerived<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>) => T,
  initial_value?: T
): Readable<T>;

function memoizedDerived<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
  initial_value?: T
): Readable<T>;

function memoizedDerived<S extends Stores, T>(
  stores: S,
  // eslint-disable-next-line @typescript-eslint/ban-types
  fn: Function,
  initial_value?: T
): Readable<T> {
  const single = !Array.isArray(stores);
  const auto = fn.length < 2;
  let prevValues: Array<Readable<any> | undefined> = single
    ? [undefined]
    : Array.from(stores, () => undefined);
  let savedResult: T;
  let cleanup: Unsubscriber | undefined;

  return derived(
    stores,
    (values, set) => {
      const valueArray: Array<Readable<any>> = single ? [values] : values;
      const newSet: typeof set = (v) => {
        savedResult = v;
        set(v);
      };
      if (valueArray.some((v, i) => v !== prevValues[i])) {
        cleanup?.();
        prevValues = valueArray;
        const result = fn(single ? valueArray[0] : valueArray, newSet);
        if (auto) {
          newSet(result);
        } else {
          cleanup = typeof result === "function" ? result : undefined;
        }
      } else {
        set(savedResult);
      }
    },
    initial_value
  );
}

function runAtMostOnce<A extends any[]>(
  this: any,
  fn: (...args: A) => Promise<void>
): (...args: A) => Promise<void> {
  let nextArgs: A | null = null;
  let currentPromise: Promise<void> = Promise.resolve();
  const start = () => {
    const args = nextArgs!;
    nextArgs = null;
    return fn.apply(this, args);
  };
  return (...args: A) => {
    if (nextArgs) {
      nextArgs = args;
    } else {
      nextArgs = args;
      currentPromise = currentPromise.then(start, start);
    }

    return currentPromise;
  };
}

function reduceReducers<S>(...reducers: Reducer<S>[]): Reducer<S> {
  return (state, action) =>
    reducers.reduce((newState, r) => r(newState, action), state) as S;
}

function waitForAction(
  actionCreator: TypedActionCreator<string>
): ThunkAction<Promise<void>, unknown, void, AnyAction> {
  return (dispatch) =>
    new Promise((resolve) => {
      dispatch(
        addListener({
          actionCreator,
          effect: (_, { unsubscribe }) => {
            unsubscribe();
            resolve();
          },
        })
      );
    });
}

export {
  privateWritable,
  Deferred,
  waitForValue,
  assert,
  memoizedDerived,
  runAtMostOnce,
  reduceReducers,
  waitForAction,
};
