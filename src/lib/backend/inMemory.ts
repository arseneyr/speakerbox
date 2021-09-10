import type {
  MainSavedState,
  SampleSavedState,
  StorageBackend,
} from "$lib/types";

let mainState: MainSavedState | null = null;
const sampleState = new Map<string, SampleSavedState>();
const sampleData = new Map<string, ArrayBuffer | AudioBuffer>();

function getMainState() {
  return Promise.resolve(mainState);
}

function setMainState(state: MainSavedState) {
  mainState = state;
  return Promise.resolve();
}

function getSampleState(id: string) {
  return Promise.resolve(sampleState.get(id) ?? null);
}

function setSampleState(state: SampleSavedState) {
  sampleState.set(state.id, state);
  return Promise.resolve();
}

function getSampleData(id: string) {
  return Promise.resolve(sampleData.get(id) ?? null);
}

function setSampleData(id: string, data: ArrayBuffer | AudioBuffer) {
  sampleData.set(id, data);
  return Promise.resolve();
}

function deleteSample(id: string) {
  sampleData.delete(id);
  return Promise.resolve();
}

function create(): StorageBackend {
  return {
    getMainState,
    setMainState,
    getSampleState,
    setSampleState,
    getSampleData,
    setSampleData,
    deleteSample,
  };
}

export default create;
