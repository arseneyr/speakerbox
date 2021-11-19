import type { ILocalBackend, IRemoteBackend } from "$lib/types";
import { RetryError, SignedInState, SignedInTypes, UserId } from "$lib/types";
import { privateWritable } from "$lib/utils";
import PCancelable, { fn } from "p-cancelable";
import inMemory from "./inMemory";

export default jest.fn(() => {
  const ret = inMemory() as any;
  for (const key of Object.keys(ret)) {
    ret[key] = jest.fn(ret[key]);
  }
  return ret;
});

function delay(delayMs: number) {
  return new Promise((res) => setTimeout(res, delayMs));
}

type MockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.Mock<ReturnType<T[K]>, Parameters<T[K]>>
    : T[K];
};

function mockAllMethods<T>(obj: T): MockedObject<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [
      key,
      typeof val === "function" ? jest.fn(val as any) : val,
    ])
  ) as MockedObject<T>;
}

export function createTestLocalBackend(delayMs = 100) {
  return new Proxy(inMemory(), {
    get: (target, prop: keyof ILocalBackend) => {
      const fn = target[prop] as any;
      if (typeof fn === "function" && prop.includes("set")) {
        return (...args: any[]) =>
          delay(delayMs).then(() => fn.apply(target, args));
      }
      return fn;
    },
  });
}

class TestRemoteBackendEndpoint implements IRemoteBackend {
  public readonly signedInUser = privateWritable<SignedInState | null>(null);

  constructor(
    private readonly _inMemoryBackend: ILocalBackend,
    private readonly _upToDateEndpoints: Map<
      string,
      Set<TestRemoteBackendEndpoint>
    >
  ) {}

  private _inFlightRequests = new Set<() => void>();
  private _runCancelable<T>(fn: () => Promise<T>): Promise<T> {
    const ret = PCancelable.fn(fn)();
    const cancel = ret.cancel.bind(ret);
    this._inFlightRequests.add(cancel);
    return ret.finally(() => this._inFlightRequests.delete(cancel));
  }
  private _cancelInFlightRequests() {
    for (const cancel of this._inFlightRequests) {
      cancel();
    }
  }

  public setState = jest.fn(async (key: string, state: unknown) => {
    if (this.signedInUser._val?.state !== SignedInTypes.SignedIn) {
      throw new Error("setting state while signed out");
    }
    const keyEndpoints = this._upToDateEndpoints.get(key);
    if (!keyEndpoints) {
      this._upToDateEndpoints.set(key, new Set([this]));
      return this._runCancelable(() =>
        this._inMemoryBackend.setState(key, state)
      );
    }

    if (keyEndpoints?.has(this)) {
      keyEndpoints.clear();
      keyEndpoints.add(this);
      return this._runCancelable(() =>
        this._inMemoryBackend.setState(key, state)
      );
    }
    throw new RetryError();
  });
  public getState = jest.fn(async (key: string) => {
    if (this.signedInUser._val?.state !== SignedInTypes.SignedIn) {
      throw new Error("getting state while signed out");
    }
    let keyEndpoints = this._upToDateEndpoints.get(key);
    if (!keyEndpoints) {
      keyEndpoints = new Set();
      this._upToDateEndpoints.set(key, keyEndpoints);
    }
    keyEndpoints.add(this);
    return this._runCancelable(() => this._inMemoryBackend.getState(key));
  });

  public deleteState = jest.fn(async (key: string) => {
    this._upToDateEndpoints.delete(key);
    return this._runCancelable(() => this._inMemoryBackend.deleteState(key));
  });
  public getStateKeys = jest.fn(async () =>
    this._runCancelable(() => this._inMemoryBackend.getStateKeys())
  );
  public __signIn(user: string): typeof this {
    this._cancelInFlightRequests();
    this.signedInUser._set({
      state: SignedInTypes.SignedIn,
      user: user as UserId,
    });
    return this;
  }
  public __signOut(): typeof this {
    this._cancelInFlightRequests();
    this.signedInUser._set({ state: SignedInTypes.SignedOut });
    return this;
  }
  public __goOffline(): typeof this {
    this._cancelInFlightRequests();
    this.signedInUser._set({ state: SignedInTypes.Offline });
    return this;
  }
}

export function createTestRemoteBackend() {
  const inMemoryBackend = inMemory();
  const upToDateEndpoints = new Map<string, Set<TestRemoteBackendEndpoint>>();
  return {
    createEndpoint: () =>
      new TestRemoteBackendEndpoint(inMemoryBackend, upToDateEndpoints),
  };
}
