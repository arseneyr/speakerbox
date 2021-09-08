import type { MainSavedState, Player, StorageBackend } from "$lib/types";
import { assert } from "$lib/utils";
import { getContext, setContext } from "svelte";
import { derived, Readable, writable } from "svelte/store";
import { SampleStore } from "./sampleStore";

const VERSION = "1.0";

const MAIN_STORE_KEY = "mainStore";

function setMainStore(store: MainStore): void {
  setContext(MAIN_STORE_KEY, store);
}

function getMainStore(): MainStore | undefined {
  return getContext<MainStore | undefined>(MAIN_STORE_KEY);
}

function isMainStateValid(state: MainSavedState | null): boolean {
  if (state?.version !== VERSION) {
    return false;
  }
  if (!Array.isArray(state.samples)) {
    return false;
  }
  if (!state.settings) {
    return false;
  }

  return true;
}

class MainStore {
  private _mainState = writable<MainSavedState | null>(null);
  private _sampleMap = new Map<string, SampleStore>();

  public samples = derived(this._mainState, (state) =>
    state?.samples.map((id) => this._sampleMap.get(id))
  );

  constructor(private readonly _backend: StorageBackend) {}

  public async init(): Promise<void> {
    return this._loadMainState();
  }

  public prepend(sample: SampleStore): void {
    this._sampleMap.set(sample.id, sample);
    this._mainState.update(
      (state) => (
        assert(state, "main store init not complete"),
        {
          ...state,
          samples: [sample.id].concat(state.samples),
        }
      )
    );
  }

  public remove(id: string): void {
    const deleted = this._sampleMap.delete(id);
    assert(deleted, "delete called on non-existing sample");

    this._mainState.update(
      (state) => (
        assert(state, "main store init not complete"),
        {
          ...state,
          samples: state.samples.filter((s) => s !== id),
        }
      )
    );
  }

  public update(ids: string[]): void {
    this._mainState.update(
      (state) => (
        assert(state, "main store init not complete"),
        { ...state, samples: ids }
      )
    );
  }

  private _onMainStateUpdate(mainState: MainSavedState | null) {
    mainState && this._backend.setMainState(mainState);
  }

  private async _loadMainState() {
    const state = (await this._backend.getMainState()) ?? {
      version: VERSION,
      settings: {},
      samples: [],
    };

    if (!isMainStateValid(state)) {
      this._backend.saveInvalidMainState?.(state);
    }

    await Promise.all(
      state.samples.map(async (id) => {
        const [sampleState, sampleData] = await Promise.all([
          this._backend.getSampleState(id),
          this._backend.getSampleData(id),
        ]);
        if (!sampleData || !sampleState) {
          assert(sampleData, `sampleData for id ${id} missing!`);
          assert(sampleState, `sampleState for id ${id} missing!`);
          return;
        }
        this._sampleMap.set(
          id,
          new SampleStore({ data: sampleData, id, title: sampleState.title })
        );
      })
    );
    this._mainState.set(state);
    this._mainState.subscribe(this._onMainStateUpdate.bind(this));
  }

  public anyPlaying: Readable<boolean> = derived(this._mainState, (_, s1) =>
    derived<Readable<Player | null>[], boolean>(
      Array.from(this._sampleMap.values(), (sample) => sample.player),
      (players, s2) =>
        derived(
          players.filter((p): p is Player => !!p).map((p) => p.playing),
          (playing) => playing.some(Boolean)
        ).subscribe(s2)
    ).subscribe(s1)
  );
}

// function createAnyPlayingStore(): Readable<boolean> & {
//   add(player: Readable<SimplePlayer | null>);
//   delete(player: Readable<SimplePlayer>);
// } {
//   const setStore = writable(
//     new Set<Readable<{ playing: Readable<boolean> } | null>>()
//   );
//   return Object.assign(
//     derived<typeof setStore, boolean>(setStore, (playerSet, s1) =>
//       derived(
//         Array.from(playerSet) as any,
//         (players: (SimplePlayer | null)[], s2) =>
//           derived(
//             players.filter((p) => p).map((p) => p.playing) as any,
//             (playing: boolean[]) => playing.some((v) => v)
//           ).subscribe(s2)
//       ).subscribe(s1)
//     ),
//     {
//       add(player: Readable<SimplePlayer | null>) {
//         setStore.update((set) => set.add(player));
//       },
//       delete(player: Readable<SimplePlayer>) {
//         setStore.update((set) => (set.delete(player), set));
//       },
//     }
//   );
// }

export { MainStore, getMainStore, setMainStore };
