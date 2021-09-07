import type { MainSavedState, StorageBackend } from "$lib/types";
import { assert } from "$lib/utils";
import PQueue from "p-queue";
import { derived, Readable, writable } from "svelte/store";
import { SampleStore } from "./sampleStore";

interface SimplePlayer {
  playing: Readable<boolean>;
}

class MainStore {
  private _mainState = writable<MainSavedState | null>(null);
  private _sampleMap = new Map<string, SampleStore>();

  public samples = derived(this._mainState, (state) =>
    state?.samples.map((id) => this._sampleMap.get(id))
  );

  constructor(private readonly _backend: StorageBackend) {
    this._loadMainState();
  }

  public prepend(sample: SampleStore): void {
    this._sampleMap.set(sample.id, sample);
    this._mainState.update((state) => ({
      ...state,
      samples: [sample.id].concat(state.samples),
    }));
  }

  public remove(id: string): void {
    const deleted = this._sampleMap.delete(id);
    assert(deleted, "delete called on non-existing sample");

    this._mainState.update((state) => ({
      ...state,
      samples: state.samples.filter((s) => s !== id),
    }));
  }

  public update(ids: string[]): void {
    this._mainState.update((state) => ({ ...state, samples: ids }));
  }

  private _saveQueue = new PQueue({ concurrency: 1 });
  private _onMainStateUpdate(mainState: MainSavedState) {
    this._saveQueue.add(() => this._backend.setMainState(mainState));
  }

  private async _loadMainState() {
    const state = await this._backend.getMainState();
    await Promise.all(
      state.samples.map(async (id) => {
        const [sampleState, sampleData] = await Promise.all([
          this._backend.getSampleState(id),
          this._backend.getSampleData(id),
        ]);
        this._sampleMap.set(
          id,
          new SampleStore(sampleData, id, sampleState.title)
        );
      })
    );
    this._mainState.set(state);
    this._mainState.subscribe(this._onMainStateUpdate.bind(this));
  }

  public anyPlaying = derived(this._mainState, (_, s1) =>
    derived(
      Array.from(this._sampleMap.values(), (sample) => sample.player),
      (players, s2) =>
        derived(
          players.filter(Boolean).map((p) => p.playing),
          (playing) => playing.some(Boolean)
        ).subscribe(s2)
    ).subscribe(s1)
  );
}

function createAnyPlayingStore(): Readable<boolean> & {
  add(player: Readable<SimplePlayer | null>);
  delete(player: Readable<SimplePlayer>);
} {
  const setStore = writable(
    new Set<Readable<{ playing: Readable<boolean> } | null>>()
  );
  return Object.assign(
    derived<typeof setStore, boolean>(setStore, (playerSet, s1) =>
      derived(
        Array.from(playerSet) as any,
        (players: (SimplePlayer | null)[], s2) =>
          derived(
            players.filter((p) => p).map((p) => p.playing) as any,
            (playing: boolean[]) => playing.some((v) => v)
          ).subscribe(s2)
      ).subscribe(s1)
    ),
    {
      add(player: Readable<SimplePlayer | null>) {
        setStore.update((set) => set.add(player));
      },
      delete(player: Readable<SimplePlayer>) {
        setStore.update((set) => (set.delete(player), set));
      },
    }
  );
}

export { MainStore, createAnyPlayingStore };
