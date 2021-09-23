import type { StorageBackend } from "$lib/types";

const state = new Map<string, unknown>();
const sampleData = new Map<string, Blob | AudioBuffer>();

function getState(id: string) {
  return Promise.resolve(state.get(id));
}

function setState(id: string, newState: unknown) {
  state.set(id, newState);
  return Promise.resolve();
}

function deleteState(id: string) {
  state.delete(id);
  return Promise.resolve();
}

// function getSampleState(id: string) {
//   return Promise.resolve(sampleState.get(id) ?? null);
// }

// function setSampleState(state: SampleSavedState) {
//   sampleState.set(state.id, state);
//   return Promise.resolve();
// }

function getSampleData(id: string) {
  return Promise.resolve(sampleData.get(id) ?? null);
}

function setSampleData(id: string, data: Blob | AudioBuffer) {
  sampleData.set(id, data);
  return Promise.resolve();
}

function deleteSampleData(id: string) {
  sampleData.delete(id);
  return Promise.resolve();
}

function create(): StorageBackend {
  return {
    getState,
    setState,
    deleteState,

    getSampleData,
    setSampleData,
    deleteSampleData,
  };
}

export default create;
