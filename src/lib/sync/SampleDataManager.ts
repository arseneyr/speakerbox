import { get, Readable } from "svelte/store";
import {
  IRemoteBackend,
  ISampleDataBackend,
  RevisionId,
  SampleData,
  SignedInTypes,
} from "$lib/types";
import PCancelable, { CancelError } from "p-cancelable";
import { assert, privateWritable } from "$lib/utils";

function generateStateKey(revisionId: RevisionId): string {
  return "sample-" + revisionId;
}

class SampleDataManager {
  public readonly sampleData = privateWritable<
    Map<RevisionId, Blob | AudioBuffer>
  >(new Map());

  private readonly _loading = new Map<RevisionId, () => void>();

  constructor(
    private readonly _localBackend: ISampleDataBackend,
    private readonly _remoteBackend: ISampleDataBackend & IRemoteBackend,
    private readonly _requestedSamples: Readable<Set<RevisionId> | null>
  ) {
    this._requestedSamples.subscribe(this._onRequestedSamplesChange.bind(this));
  }

  public addSampleData(
    revisionId: RevisionId,
    sampleData: SampleData
  ): [Promise<unknown>, Promise<unknown>] {
    this.sampleData._update((map) => {
      assert(!map.has(revisionId), "Overwriting sample!");
      map.set(revisionId, sampleData);
      return map;
    });

    const localSyncPromise = this._localBackend.setState(
      revisionId,
      sampleData
    );
    const remoteSyncPromise = this._isSignedIn()
      ? this._remoteBackend.setState(revisionId, sampleData)
      : Promise.resolve();

    return [
      localSyncPromise,
      Promise.all([localSyncPromise, remoteSyncPromise]),
    ];
  }

  public deleteSampleData(
    revisionId: RevisionId
  ): [Promise<unknown>, Promise<unknown>] {
    const localSyncPromise = this._localBackend.deleteState(revisionId);
    const remoteSyncPromise = this._isSignedIn()
      ? this._remoteBackend.deleteState(generateStateKey(revisionId))
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

      let sampleData = await this._localBackend.getState(id);
      if (cancelled) {
        throw new CancelError();
      }
      if (!sampleData) {
        if (!this._isSignedIn()) {
          throw new Error("No sample data!");
        }
        sampleData = await this._remoteBackend.getState(id);
        if (cancelled) {
          throw new CancelError();
        }
        if (!sampleData) {
          throw new Error("No sample data!");
        }
        await this._localBackend.setState(id, sampleData);
        // if (cancelled) {
        //   throw new CancelError();
        // }
      }
      return sampleData;
    }
  );

  private _onRequestedSamplesChange(samples: Set<RevisionId> | null) {
    if (!samples) {
      return null;
    }
    const currentMap = get(this.sampleData);
    for (const revisionId of samples) {
      if (currentMap.has(revisionId) || this._loading.has(revisionId)) {
        continue;
      }
      const promise = this._load(revisionId);
      promise
        .finally(() => this._loading.delete(revisionId))
        .then(
          (data) => {
            this.sampleData._update((map) => map.set(revisionId, data));
          },
          (err) => {
            if (!(err instanceof CancelError)) {
              throw err;
            }
          }
        );
      this._loading.set(revisionId, promise.cancel.bind(promise));
    }
    for (const [revId, cancel] of this._loading) {
      if (!samples.has(revId)) {
        cancel();
      }
    }
  }

  private _isSignedIn(): boolean {
    return (
      get(this._remoteBackend.signedInUser)?.state === SignedInTypes.SignedIn
    );
  }
}

export default SampleDataManager;
