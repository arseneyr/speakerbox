import { SignedInState, SignedInTypes } from "$lib/sync/types";
import { privateWritable } from "$lib/utils";
import inMemory from "./inMemory";

export default jest.fn(() => {
  const ret = inMemory() as any;
  for (const key of Object.keys(ret)) {
    ret[key] = jest.fn(ret[key]);
  }
  return ret;
});

export function createTestRemoteBackend() {
  const inMemoryBackend = inMemory();
  const upToDateEndpoints = new Map<string, Set<any>>();
  return {
    createEndpoint() {
      return {
        ...inMemoryBackend,
        setState(key: string, state: unknown) {
          if (this.signedInUser._val.state !== SignedInTypes.SignedIn) {
            throw new Error("setting state while signed out");
          }
          const keyEndpoints = upToDateEndpoints.get(key);
          if (keyEndpoints?.has(this)) {
            keyEndpoints.clear();
            keyEndpoints.add(this);
            return inMemoryBackend.setState(key, state);
          }
          throw new Error("State changed since last change!");
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
        __signIn(user: string) {
          this.signedInUser._set({ state: SignedInTypes.SignedIn, user });
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
