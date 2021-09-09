import localForage from "localforage";
import type {
  MainSavedState,
  SampleSavedState,
  StorageBackend,
} from "$lib/types";

const MAIN_STATE_KEY = "speakerbox";

let persistent: boolean | null = null;

function getSampleStateKey(id: string) {
  return `sample-` + id;
}

function getSampleDataKey(id: string) {
  return `data-` + id;
}

async function getMainState() {
  return localForage.getItem<MainSavedState | null>(MAIN_STATE_KEY);
}

async function setMainState(state: MainSavedState) {
  return localForage.setItem(MAIN_STATE_KEY, state);
}

async function getSampleState(id: string) {
  return localForage.getItem<SampleSavedState | null>(getSampleStateKey(id));
}

async function setSampleState(state: SampleSavedState) {
  return localForage.setItem(getSampleStateKey(state.id), state);
}

async function getSampleData(id: string) {
  return localForage.getItem<ArrayBuffer | null>(getSampleDataKey(id));
}

async function setSampleData(id: string, data: ArrayBuffer) {
  if (persistent === false) {
    persistent = true;
    navigator.storage
      .persist()
      .then((p) => !p && console.error("persistence denied!"));
  }
  return localForage.setItem(getSampleDataKey(id), data);
}

function create(): StorageBackend {
  navigator.storage.persisted().then((p) => (persistent = p));
  return {
    getMainState,
    setMainState,

    getSampleState,
    setSampleState,

    getSampleData,
    setSampleData,
  };
}

export default create;
