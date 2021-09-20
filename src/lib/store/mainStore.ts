import type {
  MainSavedState,
  Player,
  SavedSettings,
  StorageBackend,
} from "$lib/types";
import { assert } from "$lib/utils";
import { getContext, setContext } from "svelte";
import { derived, writable } from "svelte/store";
import type { Readable, Unsubscriber } from "svelte/store";
import { SampleStore } from "./sampleStore";
import { getAudioContext } from "$lib/audioContext";

const VERSION = "1.0";

const MAIN_STORE_KEY = "mainStore";

function setMainStore(store: MainStore): void {
  setContext(MAIN_STORE_KEY, store);
}

function getMainStore(): MainStore | undefined {
  return getContext<MainStore | undefined>(MAIN_STORE_KEY);
}

function isMainStateValid(state: unknown | null): state is MainSavedState {
  if (typeof state !== 'object' || state === null) {
    return false
  }
  if ('version' in state && state?.version !== VERSION) {
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
  private _sampleMap = new Map<
    string,
    { sample: SampleStore; subs: Unsubscriber[] }
  >();
  private readonly _initPromise: Promise<void>;

  public samples = derived(this._mainState, (state) =>
    state?.samples.map((id) => {
      const mapValue = this._sampleMap.get(id);
      assert(mapValue, `sample ${id} not found in map!`);
      return mapValue.sample;
    })
  );

  public settings = derived(this._mainState, (state) => state?.settings);

  constructor(private readonly _backend: StorageBackend) {
    this._initPromise = this._loadMainState();
    // this.anyPlaying.subscribe(this._onAnyPlayingChange.bind(this));
  }

  public init(): Promise<void> {
    return this._initPromise;
  }

  public prepend(sample: SampleStore): void {
    this._addSample(sample);
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

  public append(sample: SampleStore): void {
    this._addSample(sample);
    this._mainState.update(
      (state) => (
        assert(state, "main store init not complete"),
        {
          ...state,
          samples: state.samples.concat(sample.id),
        }
      )
    );
  }

  public remove(id: string): { undo: () => void; delete: () => void } {
    const sample = this._sampleMap.get(id)?.sample;
    assert(sample, "removing non-existant sample!");
    this._removeSample(id);
    let samplePosition = 0;

    this._mainState.update((state) => {
      assert(state, "main store init not complete");
      samplePosition = state?.samples.indexOf(id) ?? 0;
      return {
        ...state,
        samples: state.samples.filter((s) => s !== id),
      };
    });

    return {
      undo: () => {
        this._addSample(sample);
        this._mainState.update(
          (state) => (
            assert(state, "main store init not complete"),
            {
              ...state,
              samples: [
                ...state.samples.slice(0, samplePosition),
                sample.id,
                ...state.samples.slice(samplePosition),
              ],
            }
          )
        );
      },
      delete: () => {
        this._backend.deleteSample(sample.id);
        sample.destroy();
      },
    };
  }

  public update(ids: string[]): void {
    this._mainState.update(
      (state) => (
        assert(state, "main store init not complete"),
        { ...state, samples: ids }
      )
    );
  }

  public updateSettings(settings: SavedSettings): void {
    this._mainState.update((state) => state && { ...state, settings });
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
        this._addSample(
          new SampleStore({ data: sampleData, id, title: sampleState.title })
        );
      })
    );
    this._mainState.set(state);
    this._mainState.subscribe(this._onMainStateUpdate.bind(this));
  }

  private _addSample(sample: SampleStore) {
    let prevSavedData: ArrayBuffer | AudioBuffer | null = null;

    const subs = [
      sample.saveSource.subscribe((source) => {
        if (prevSavedData !== source) {
          prevSavedData = source;
          source && this._backend.setSampleData(sample.id, source);
        }
      }),
      sample.title.subscribe((title) =>
        this._backend.setSampleState({
          id: sample.id,
          title: title ?? undefined,
        })
      ),
    ];

    this._sampleMap.set(sample.id, { sample, subs });
  }

  private _removeSample(id: string) {
    const value = this._sampleMap.get(id);
    assert(value, "sample not found!");

    value.subs.forEach((f) => f());
    this._sampleMap.delete(id);
  }

  private _onAnyPlayingChange(anyPlaying: boolean) {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    function waitForIdle() {
      idleTimer && clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, 1500);
    }
    function onIdle() {
      idleTimer = undefined;
      document.addEventListener("mousemove", eventHandler);
    }
    function eventHandler() {
      console.log("mouse moved!");
      document.removeEventListener("mousemove", eventHandler);
      getAudioContext().resume();
      waitForIdle();
    }
    console.log(`anyPlaying: ${anyPlaying}`);
    if (!anyPlaying) {
      waitForIdle();
    } else {
      idleTimer && clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  }

  public anyPlaying: Readable<boolean> = derived(this._mainState, (_, s1) =>
    derived<Readable<Player | null>[], boolean>(
      Array.from(this._sampleMap.values(), ({ sample }) => sample.player),
      (players, s2) =>
        derived(
          players.filter((p): p is Player => !!p).map((p) => p.playing),
          (playing) => playing.some(Boolean)
        ).subscribe(s2)
    ).subscribe(s1)
  );
}

export { MainStore, getMainStore, setMainStore };
