import {
  CallEffectDescriptor,
  ChannelTakeEffectDescriptor,
  JoinEffectDescriptor,
  StrictEffect,
  TakeEffectDescriptor,
} from "redux-saga/effects";

export class Deferred<T> {
  private readonly _promise: Promise<T>;
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: unknown) => void;

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

export type ReduxSagaEffectReturnType<E extends StrictEffect> =
  E["payload"] extends CallEffectDescriptor<infer CallRT>
    ? // also covers `spawn`, `fork` & `delay` (types built on CallEffectDescriptor)
      CallRT
    : E["payload"] extends JoinEffectDescriptor // `join` support
      ? E["payload"]
      : E["payload"] extends TakeEffectDescriptor<infer A>
        ? A
        : E["payload"] extends ChannelTakeEffectDescriptor<infer U>
          ? U
          : never;

type RaceResult<
  RaceArgs extends Record<string, StrictEffect>,
  WinningKey extends keyof RaceArgs = keyof RaceArgs,
> = {
  [Label in keyof RaceArgs]: Label extends WinningKey
    ? ReduxSagaEffectReturnType<RaceArgs[Label]>
    : undefined;
};

export type SagaCancellablePromise<T> = Promise<T> & {
  [K: string]: () => unknown;
};

// return value from yielding race effects is incorrect:
// `yield` always returns type `any` due to typescript semantics
// the `race` return type is targeted at the middleware consumer, NOT fn callers
// we could use `typed-redux-saga` but it adds overhead we can avoid.

// this type returns a union of all possible RaceResult types (e.g. objects
// where every property is undefined except the WinningKey). consumers should
// use this type for `race`'s yielded return and discriminate to find the
// valid result.
export type RaceResults<RaceArgs extends Record<string, StrictEffect>> =
  RaceResult<RaceArgs, keyof RaceArgs>;

export type GuardedType<T> = T extends (
  x: unknown,
  ...args: unknown[]
) => x is infer U
  ? U
  : never;
