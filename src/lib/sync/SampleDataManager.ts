import { derived, get, Readable } from "svelte/store";
import type {
  ILocalBackend,
  IRemoteBackend,
  MainState,
  RevisionId,
} from "./types";
import PCancelable, { CancelError } from "p-cancelable";
import { assert, privateWritable } from "$lib/utils";

class SampleDataManager {
  public readonly sampleData = privateWritable<
    Map<RevisionId, Blob | AudioBuffer>
  >(new Map());

  private readonly _loading = new Map<RevisionId, () => void>();

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend,
    private readonly _mainState: Readable<MainState | null>
  ) {
    this._mainState.subscribe(this._onMainStateChange.bind(this));
  }

  public addSampleData(
    revisionId: RevisionId,
    sampleData: Blob | AudioBuffer
  ): [Promise<unknown>, Promise<unknown>] {
    this.sampleData._update((map) => {
      assert(!map.has(revisionId), "Overwriting sample!");
      map.set(revisionId, sampleData);
      return map;
    });

    const localSyncPromise = this._localBackend.setSampleData(
      revisionId,
      sampleData
    );
    const remoteSyncPromise = this._signedIn()
      ? this._remoteBackend.setSampleData(revisionId, sampleData)
      : Promise.resolve();

    return [
      localSyncPromise,
      Promise.all([localSyncPromise, remoteSyncPromise]),
    ];
  }

  private _load = PCancelable.fn(
    async (id: RevisionId, onCancel: PCancelable.OnCancelFunction) => {
      let cancelled = false;
      onCancel(() => (cancelled = true));

      let sampleData = await this._localBackend.getSampleData(id);
      if (cancelled) {
        throw new CancelError();
      }
      if (!sampleData) {
        if (!this._signedIn()) {
          throw new Error("No sample data!");
        }
        sampleData = await this._remoteBackend.getSampleData(id);
        if (cancelled) {
          throw new CancelError();
        }
        if (!sampleData) {
          throw new Error("No sample data!");
        }
        await this._localBackend.setSampleData(id, sampleData);
        // if (cancelled) {
        //   throw new CancelError();
        // }
      }
      return sampleData;
    }
  );

  private _onMainStateChange(mainState: MainState | null) {
    if (!mainState) {
      return null;
    }
    const currentMap = get(this.sampleData);
    for (const id of mainState.sampleList) {
      const sample = mainState.samples[id];
      if (!sample) {
        throw new Error("missing sample!");
      }
      const { revisionId } = sample;
      if (currentMap.has(revisionId) || this._loading.has(revisionId)) {
        continue;
      }
      const promise = this._load(revisionId);
      promise.then(
        (data) => {
          this._loading.delete(revisionId);
          this.sampleData._update((map) => map.set(revisionId, data));
        },
        (err) => {
          this._loading.delete(revisionId);
          if (!(err instanceof CancelError)) {
            throw err;
          }
        }
      );
      this._loading.set(revisionId, promise.cancel.bind(promise));
    }
    // for (const [id, cancel] of this._loading) {
    //   if (!mainState.sampleList.includes(id)) {
    //     cancel();
    //   }
    // }
    // this.sampleData._update((map) => {
    //   for (const [id] of map) {
    //     if (!mainState.sampleList.includes(id)) {
    //       map.delete(id);
    //     }
    //   }
    //   return map;
    // });
  }

  private _signedIn(): boolean {
    return typeof get(this._remoteBackend.signedInUser) === "string";
  }
}

export default SampleDataManager;
