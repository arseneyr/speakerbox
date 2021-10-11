import type { StorageBackend } from "$lib/types";
import cloneDeep from "clone-deep";

class InMemoryBackend implements StorageBackend {
  private _state = new Map<string, unknown>();
  private _sampleData = new Map<string, Blob | AudioBuffer>();

  public getState(id: string) {
    return Promise.resolve(this._state.get(id));
  }

  public setState(id: string, newState: unknown) {
    this._state.set(id, cloneDeep(newState));
    return Promise.resolve();
  }

  public deleteState(id: string) {
    this._state.delete(id);
    return Promise.resolve();
  }

  public getSampleData(id: string) {
    return Promise.resolve(this._sampleData.get(id) ?? null);
  }

  public setSampleData(id: string, data: Blob | AudioBuffer) {
    this._sampleData.set(id, data);
    return Promise.resolve();
  }

  public deleteSampleData(id: string) {
    this._sampleData.delete(id);
    return Promise.resolve();
  }
}

export default (): StorageBackend => new InMemoryBackend();
