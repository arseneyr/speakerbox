import { derived, get, Readable, writable } from "svelte/store";
import { assert } from "$lib/utils";
import { v4 } from "uuid";
import StateManager, { StateManagerOutputState } from "./StateManager";
import {
  generateRevisionId,
  ILocalBackend,
  IRemoteBackend,
  ISampleDataBackend,
  ISyncManager,
  MainState,
  RevisionId,
  SampleParams,
} from "$lib/types";
import SampleDataManager from "./SampleDataManager";

class SyncManager implements ISyncManager {
  private readonly _stateManager;
  private readonly _sampleDataManager;

  public readonly store;

  constructor(
    private readonly _localBackend: ILocalBackend & ISampleDataBackend,
    private readonly _remoteBackend: IRemoteBackend & ISampleDataBackend
  ) {
    this._stateManager = new StateManager(
      this._localBackend,
      this._remoteBackend
    );
    this._sampleDataManager = new SampleDataManager(
      this._localBackend,
      this._remoteBackend,
      derived(
        this._stateManager.mainState,
        this._sampleDataManagerDerivedStore.bind(this)
      )
    );
    this.store = derived(
      [this._stateManager.mainState],
      this._derivedStore.bind(this)
    );
  }

  public async init(): Promise<typeof this> {
    await this._stateManager.init();
    return this;
  }

  public async addSample(params: SampleParams): Promise<void> {
    const { id, title, data } = params;
    const revisionId = generateRevisionId();
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
    this._stateManager.updateMainState((state) => {
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

  private _sampleDataManagerDerivedStore(
    mainState: StateManagerOutputState
  ): Set<RevisionId> | null {
    return mainState
      ? new Set(
          mainState.sampleList
            .map((id) => {
              assert(
                mainState.samples[id]?.revisionId,
                "sample list references missing sample"
              );

              return mainState.samples[id].revisionId;
            })
            .concat(
              Object.values(mainState.conflicts ?? {})
                .filter((c) => !!c.revisionId)
                .flatMap(({ revisionId }) =>
                  revisionId!.remoteValues.concat(revisionId!.localValue)
                )
            )
        )
      : null;
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
