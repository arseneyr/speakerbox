import {
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

export function assert(
  condition: unknown,
  message?: string
): asserts condition {
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
