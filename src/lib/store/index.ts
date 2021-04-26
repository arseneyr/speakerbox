import { derived, get, readable, Writable, writable } from "svelte/store";
import { v4 } from "uuid";
import { persistantWritable } from "./utils";

const VERSION = "1.0";

export interface StorageBackend {
  getMainState(): Promise<MainSavedState | null>;
  setMainState(state: MainSavedState): Promise<unknown>;

  getSampleState(id: string): Promise<SampleSavedState | null>;
  setSampleState(state: SampleSavedState): Promise<unknown>;

  getSampleData(id: string): Promise<ArrayBuffer | null>;
  setSampleData(id: string, data: ArrayBuffer): Promise<unknown>;
}

export interface MainSavedState {
  version: string;
  samples: string[];
}

export interface SampleSavedState {
  id: string;
  title?: string;
}

interface SampleState extends SampleSavedState {
  loading: boolean;
  paused: boolean;
  audioData?: ArrayBuffer;
  durationMs?: number;
  error?: string;
}

const mainStateWritable = (init) =>
  persistantWritable(init, (v) => backend.setMainState(v));

type SampleStore = ReturnType<typeof createSampleStore>;

let backend: StorageBackend = null;
const sampleStores = new Map<string, SampleStore>();

export async function initialize(newBackend: StorageBackend) {
  backend = newBackend;
  let mainState = await backend.getMainState();
  if (!mainState) {
    mainState = { version: VERSION, samples: [] };
  }

  return mainStateWritable(mainState);
}

export function getSample(id: string): SampleStore {
  let store = sampleStores.get(id);
  if (!store) {
    store = createSampleStore(id);
    store.loadExisting();
  }
  return store;
}

export function createNewSample(
  data: Blob | ArrayBuffer,
  title?: string
): SampleStore {
  const id = v4();
  const store = createSampleStore(id);
  store.title.set(title);
  (data instanceof Blob ? data.arrayBuffer() : Promise.resolve(data)).then(
    (buf) => {
      store.loading.set(false);
      store.audioData.set(buf);
    }
  );

  sampleStores.set(id, store);
  return store;
}

export function destroySample(id: string): void {
  sampleStores.get(id)?.destroy();
  sampleStores.delete(id);
}

function createSampleStore(id: string) {
  const title = writable<string>(undefined);
  const loading = writable(true);
  const paused = writable(true);
  const audioData = writable<ArrayBuffer>(undefined);
  const error = writable<string>(undefined);

  const sync = [
    title.subscribe((newTitle) =>
      backend.setSampleState({ id, title: newTitle })
    ),
    audioData.subscribe((newData) => backend.setSampleData(id, newData)),
  ];

  return {
    id,
    title,
    loading,
    paused,
    audioData,
    destroy: () => {
      sync.forEach((stop) => stop());
    },
    loadExisting: async () => {
      const [state, data] = await Promise.all([
        backend.getSampleState(id),
        backend.getSampleData(id),
      ]);
      loading.set(false);
      if (!state) {
        error.set("Sample could not be loaded");
      } else if (!data) {
        error.set("Sample audio data could not be loaded");
      } else {
        audioData.set(data);
      }
    },

    // updateData: async (data: ArrayBuffer) => {
    //   await backend.setSampleData(id, data);
    //   update((s) => ({
    //     ...s,
    //     audioData: data,
    //   }));
    // },
  };
}
