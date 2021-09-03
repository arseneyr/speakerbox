import type { MainSavedState, StorageBackend } from "$lib/types";
import { privateWritable } from "$lib/utils";
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
    _backend.getMainState().then((s) => {
      this._mainState.set(s);
      this._mainState.subscribe(this._onMainStateUpdate.bind(this));
    });
  }

  // public append(sample: SampleStore) {
  // this.samples._update((samples) => samples.concat(sample));
  // }
  public prepend(sample: SampleStore) {
    // this.samples._update((samples) => [sample].concat(samples));
    this._sampleMap.set(sample.id, sample);
    this._mainState.update((state) => ({
      ...state,
      samples: [sample.id].concat(state.samples),
    }));
  }

  public delete(id: string) {
    this._sampleMap.delete(id);
    this._mainState.update((state) => ({
      ...state,
      samples: state.samples.filter((s) => s !== id),
    }));
  }

  public update(ids: string[]) {
    this._mainState.update((state) => ({ ...state, samples: ids }));
  }

  private _onMainStateUpdate(mainState: MainSavedState) {
    this._backend.setMainState(mainState);
  }
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
