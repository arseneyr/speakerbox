import localForage, { config } from "localforage";
import { assert } from "$lib/utils";
import {
  ILocalBackend,
  ISampleDataBackend,
  RevisionId,
  SampleData,
} from "$lib/types";

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

let persistent: boolean | null = null;

// function getSampleDataKey(id: string) {
//   return `data-` + id;
// }

function getAudioBufferChannelKey(id: string, channel: number) {
  return `buffer-${id}-channel-${channel}`;
}

function getState(id: RevisionId): Promise<SampleData | null>;
async function getState(id: string | RevisionId) {
  return RevisionId.is(id)
    ? getSampleData(id)
    : localForage.getItem<unknown | null>(id);
}

async function setState(id: string | RevisionId, state: unknown) {
  return RevisionId.is(id) &&
    (state instanceof Blob || state instanceof AudioBuffer)
    ? setSampleData(id, state)
    : localForage.setItem(id, state);
}

async function deleteState(id: string | RevisionId) {
  return RevisionId.is(id) ? deleteSampleData(id) : localForage.removeItem(id);
}

async function getStateKeys() {
  return localForage.keys();
}

// async function getSampleState(id: string) {
//   return localForage.getItem<SampleSavedState | null>(getSampleStateKey(id));
// }

// async function setSampleState(state: SampleSavedState) {
//   return localForage.setItem(getSampleStateKey(state.id), state);
// }

async function getSampleData(id: RevisionId) {
  const value = await localForage.getItem<Blob | SerializedAudioBuffer | null>(
    id
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

async function setSampleData(id: RevisionId, data: Blob | AudioBuffer) {
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
          localForage.setItem(id, {
            numberOfChannels: data.numberOfChannels,
            sampleRate: data.sampleRate,
            length: data.length,
          })
        )
    );
  } else {
    await localForage.setItem(id, data);
  }
}

async function deleteSampleData(id: RevisionId) {
  const data = await localForage.getItem<Blob | SerializedAudioBuffer | null>(
    id
  );

  const deleteArray = [localForage.removeItem(id)];

  if (isSerializedAudioBuffer(data)) {
    for (let i = 0; i < data.numberOfChannels; ++i) {
      deleteArray.push(localForage.removeItem(getAudioBufferChannelKey(id, i)));
    }
  }

  await Promise.all(deleteArray);
}

function create(): ILocalBackend & ISampleDataBackend {
  navigator.storage.persisted().then((p) => (persistent = p));
  config({
    name: "sb-data",
  });
  return {
    getState,
    setState,
    deleteState,
    getStateKeys,
  };
}

export default create;
