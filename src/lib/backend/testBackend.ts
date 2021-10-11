import { RetryError, SignedInState, SignedInTypes } from "$lib/sync/types";
import type { StorageBackend } from "$lib/types";
import { privateWritable } from "$lib/utils";
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

export function createTestLocalBackend(delayMs = 100) {
  return new Proxy(inMemory(), {
    get: (target, prop: keyof StorageBackend) => {
      const fn = target[prop] as any;
      if (typeof fn === "function" && prop.includes("set")) {
        return (...args: any[]) =>
          delay(delayMs).then(() => fn.apply(target, args));
      }
      return fn;
    },
  });
}

export function createTestRemoteBackend() {
  const inMemoryBackend = inMemory();
  const upToDateEndpoints = new Map<string, Set<any>>();
  return {
    createEndpoint() {
      return {
        setState(key: string, state: unknown) {
          if (this.signedInUser._val.state !== SignedInTypes.SignedIn) {
            throw new Error("setting state while signed out");
          }
          const keyEndpoints = upToDateEndpoints.get(key);
          if (!keyEndpoints) {
            upToDateEndpoints.set(key, new Set([this]));
            return inMemoryBackend.setState(key, state);
          }

          if (keyEndpoints?.has(this)) {
            keyEndpoints.clear();
            keyEndpoints.add(this);
            return inMemoryBackend.setState(key, state);
          }
          throw new RetryError();
        },
        getState(key: string) {
          if (this.signedInUser._val.state !== SignedInTypes.SignedIn) {
            throw new Error("getting state while signed out");
          }
          let keyEndpoints = upToDateEndpoints.get(key);
          if (!keyEndpoints) {
            keyEndpoints = new Set();
            upToDateEndpoints.set(key, keyEndpoints);
          }
          keyEndpoints.add(this);
          return inMemoryBackend.getState(key);
        },
        deleteState(key: string) {
          upToDateEndpoints.delete(key);
          return inMemoryBackend.deleteState(key);
        },
        signedInUser: privateWritable<SignedInState>({
          state: SignedInTypes.SignedOut,
        }),
        __signIn(user: string): typeof this {
          this.signedInUser._set({ state: SignedInTypes.SignedIn, user });
          return this;
        },
        __signOut() {
          this.signedInUser._set({ state: SignedInTypes.SignedOut });
        },
        __goOffline() {
          this.signedInUser._set({ state: SignedInTypes.Offline });
        },
      };
    },
  };
}
