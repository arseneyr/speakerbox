import localForage from "localforage";
import type {
  MainSavedState,
  SampleSavedState,
  StorageBackend,
} from "$lib/types";
import { assert } from "$lib/utils";

interface SerializedAudioBuffer {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
}

function isSerializedAudioBuffer(
  input: Blob | SerializedAudioBuffer | null
): input is SerializedAudioBuffer {
  return (
    typeof input === "object" &&
    input !== null &&
    "numberOfChannels" in input &&
    "sampleRate" in input &&
    "length" in input &&
    input["numberOfChannels"] < 20
  );
}

const MAIN_STATE_KEY = "speakerbox";

function getStateKey(id: string) {
  return `sb-state-` + id;
}

let persistent: boolean | null = null;

function getSampleStateKey(id: string) {
  return `sample-` + id;
}

function getSampleDataKey(id: string) {
  return `data-` + id;
}

function getAudioBufferChannelKey(id: string, channel: number) {
  return `buffer-${id}-channel-${channel}`;
}

async function getState(id: string) {
  return localForage.getItem<unknown | null>(getStateKey(id));
}

async function setState(id: string, state: unknown) {
  return localForage.setItem(getStateKey(id), state);
}

async function deleteState(id: string) {
  return localForage.removeItem(getStateKey(id));
}

async function getSampleState(id: string) {
  return localForage.getItem<SampleSavedState | null>(getSampleStateKey(id));
}

async function setSampleState(state: SampleSavedState) {
  return localForage.setItem(getSampleStateKey(state.id), state);
}

async function getSampleData(id: string) {
  const value = await localForage.getItem<Blob | SerializedAudioBuffer | null>(
    getSampleDataKey(id)
  );
  if (isSerializedAudioBuffer(value)) {
    const channelData = await Promise.all(
      Array.from({ length: value.numberOfChannels }, (_, i) =>
        localForage.getItem<Float32Array>(getAudioBufferChannelKey(id, i))
      )
    );
    if (channelData.some((d) => !d)) {
      assert(false, `missing channel data for sample ${id}`);
      return null;
    }
    const audioBuffer = new AudioBuffer(value);
    (channelData as Float32Array[]).forEach((data, i) =>
      audioBuffer.copyToChannel(data, i)
    );
    return audioBuffer;
  }

  return value;
}

async function setSampleData(id: string, data: Blob | AudioBuffer) {
  if (persistent === false) {
    persistent = true;
    navigator.storage
      .persist()
      .then((p) => !p && console.error("persistence denied!"));
  }
  if (data instanceof AudioBuffer) {
    const channelData = Array.from({ length: data.numberOfChannels }, (_, i) =>
      data.getChannelData(i)
    );
    await Promise.all(
      channelData
        .map<Promise<unknown>>((data, i) =>
          localForage.setItem(getAudioBufferChannelKey(id, i), data)
        )
        .concat(
          localForage.setItem(getSampleDataKey(id), {
            numberOfChannels: data.numberOfChannels,
            sampleRate: data.sampleRate,
            length: data.length,
          })
        )
    );
  } else {
    await localForage.setItem(getSampleDataKey(id), data);
  }
}

async function deleteSampleData(id: string) {
  const data = await localForage.getItem<Blob | SerializedAudioBuffer | null>(
    getSampleDataKey(id)
  );

  const deleteArray = [localForage.removeItem(getSampleDataKey(id))];

  if (isSerializedAudioBuffer(data)) {
    for (let i = 0; i < data.numberOfChannels; ++i) {
      deleteArray.push(localForage.removeItem(getAudioBufferChannelKey(id, i)));
    }
  }

  await Promise.all(deleteArray);
}

function create(): StorageBackend {
  navigator.storage.persisted().then((p) => (persistent = p));
  return {
    getState,
    setState,
    deleteState,

    // getSampleState,
    // setSampleState,

    getSampleData,
    setSampleData,

    deleteSampleData,
  };
}

export default create;
