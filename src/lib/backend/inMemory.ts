import type {
  ILocalBackend,
  ISampleDataBackend,
  RevisionId,
  SampleData,
} from "$lib/types";
import cloneDeep from "clone-deep";

class InMemoryBackend implements ILocalBackend, ISampleDataBackend {
  private _state = new Map<string, unknown>();

  public getState(id: RevisionId): Promise<SampleData | null>;
  public getState(id: string | RevisionId) {
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

  public getStateKeys() {
    return Promise.resolve(Array.from(this._state.keys()));
  }
}

export default (): ILocalBackend & ISampleDataBackend => new InMemoryBackend();
