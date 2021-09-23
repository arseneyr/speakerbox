import * as t from "io-ts";
import { derived, get, Readable, writable } from "svelte/store";
import { assert } from "$lib/utils";
import { v4 } from "uuid";
import StateManager from "./StateManager";
import type { ISyncManager, MainState, SampleId } from "./types";

class SyncManager implements ISyncManager {
  private readonly _sampleDataCache = writable(
    new Map<RevisionId, Blob | AudioBuffer>()
  );

  private readonly _stateManager;

  public readonly store;

  constructor(
    private readonly _localBackend: ILocalBackend,
    private readonly _remoteBackend: IRemoteBackend
  ) {
    this._stateManager = new StateManager(
      this._localBackend,
      this._remoteBackend
    );
    this.store = derived(
      [this._stateManager.mainState],
      this._derivedStore.bind(this)
    );
  }

  public async addSample(params: SampleParams): Promise<void> {
    const { id, title, data } = params;
    const revisionId = v4();
    this._sampleDataCache.update((map) => map.set(id, data));
    return this._updateMainState((state) => {
      state.samples[id] = { title, revisionId };
    });
  }

  public async setSampleOrder(ids: SampleId[]): Promise<void> {
    return this._updateMainState((state) => {
      state.sampleList = ids;
    });
  }

  public async updateSample(
    update: Parameters<ISyncManager["updateSample"]>[0]
  ): Promise<void> {
    const { id, title, data } = update;
    let oldRevisionId: string | undefined, newRevisionId: string | undefined;
    await this._updateMainState((state) => {
      const sample = state.samples[id];
      if (data) {
        oldRevisionId = sample.revisionId;
        newRevisionId = v4();
        this._sampleDataCache.update((map) => {
          map.delete(oldRevisionId!);
          map.set(newRevisionId!, data);
          return map;
        });
      }
      if (title) {
        sample.title = title;
      }
    });
    newRevisionId && data && (await this._saveSampleData(newRevisionId, data));
    oldRevisionId && (await this._saveSampleData(oldRevisionId, null));
  }

  private _derivedStore([mainState, sampleDataCache]: [
    MainState | undefined,
    Map<SampleId, Blob | AudioBuffer>
  ]) {
    if (!mainState) {
      return null;
    }

    return mainState.sampleList.map((id) => {
      const sample = mainState.samples[id];
      const sampleData = sampleDataCache.get(sample.revisionId);

      assert(!!sample, "missing sample metadata");

      return {
        id,
        title: sample.title,
        sampleData,
      };
    });
  }
}

export default SyncManager;
