import { BehaviorSubject } from "rxjs";
import type { SampleStore } from "./store_rxjs";

export class MainStore {
  private readonly _sampleMap = new Map<string, SampleStore>();
  private readonly _sampleMap$ = new BehaviorSubject(this._sampleMap);

  private _addToSampleMap(sample: SampleStore) {
    this._sampleMap.set(sample.id, sample);
    this._sampleMap$.next(this._sampleMap);
  }

  public addSample(sample: SampleStore) {
    this._addToSampleMap(sample);
  }
}
