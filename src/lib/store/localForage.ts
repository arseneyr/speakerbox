import localForage from "localforage";
import type {
  MainSavedState,
  SampleSavedState,
  StorageBackend,
} from "./sampleStore";

const MAIN_STATE_KEY = "speakerbox";

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
  return localForage.setItem(getSampleDataKey(id), data);
}

export default {
  getMainState,
  setMainState,

  getSampleState,
  setSampleState,

  getSampleData,
  setSampleData,
} as StorageBackend;
