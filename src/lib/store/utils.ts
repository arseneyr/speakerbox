import {
  Readable,
  readable,
  StartStopNotifier,
  Subscriber,
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

export function waitForValue<T>(
  store: Readable<T>
  // predicate?: (val: T) => boolean
): Promise<NonNullable<T>> {
  return new Promise((resolve) => {
    const unsub = store.subscribe((val) => {
      if (val) {
        unsub();
        resolve(val as NonNullable<T>);
      }
    });
  });
}
