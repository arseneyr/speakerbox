import { inMemory } from "$lib/backend";
import { SampleStore, initialize } from "./sampleStore";
import { get } from "svelte/store";
import { waitForValue } from "$lib/utils";
import { getAudioContext } from "$lib/audioContext";

jest.mock("../backend", () => {
  const original = jest.requireActual("../backend").inMemory;
  const ret = {};
  Object.entries(original).forEach(
    ([key, prop]) =>
      typeof prop === "function" && (ret[key] = jest.fn(original[key]))
  );
  return { inMemory: ret };
});

jest.mock("./player", () => ({
  ...jest.requireActual<any>("./player"),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  createEncodedPlayer: jest.fn(async () => ({ destroy: () => {} })),
}));

beforeEach(() => {
  getAudioContext().decodeAudioData.mockClear();
});

beforeAll(() => initialize(inMemory));

test("main saved data loaded", () => {
  expect(inMemory.getMainState).toHaveBeenCalledTimes(1);
});

test("creating new sample from arraybuffer", () => {
  const sample = SampleStore.createNewSample(new ArrayBuffer(0), "test title");
  expect(get(sample.title)).toBe("test title");
  expect(get(sample.player)).toBeDefined();
});

test("audioBuffer decoding works", async () => {
  const [encoded, decoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(encoded);
  await expect(waitForValue(sample.audioBuffer)).resolves.toBe(decoded);
});

test("creating new sample from blob", async () => {
  const [encoded, decoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(new Blob([encoded]));
  await expect(waitForValue(sample.audioBuffer)).resolves.toBe(decoded);
});

test("audioBuffer decoding is cancelled properly", async () => {
  const [encodedFirst] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(encodedFirst);
  await expect(waitForValue(sample["_encodedAudio"])).resolves.toBe(
    encodedFirst
  );

  expect(getAudioContext().decodeAudioData).not.toHaveBeenCalled();
  const decodePromise = waitForValue(sample.audioBuffer);
  expect(getAudioContext().decodeAudioData).toHaveBeenCalledTimes(1);

  const [encodedSecond, decodedSecond] = WebAudioTestAPI.createEncodedBuffer();

  sample["_encodedAudio"].set(encodedSecond);
  await expect(decodePromise).resolves.toBe(decodedSecond);
});

test("setting audiobuffer does not cause decoding", () => {
  const sample = SampleStore.createNewSample(new ArrayBuffer(0));
  const newAudioBuffer = getAudioContext().createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  expect(getAudioContext().decodeAudioData).not.toHaveBeenCalled();
  expect(get(sample.audioBuffer)).toBe(newAudioBuffer);
});

test("setting audiobuffer cancels properly", async () => {
  const sample = SampleStore.createNewSample(new ArrayBuffer(0));
  await waitForValue(sample["_encodedAudio"]);
  const audioBufferPromise = waitForValue(sample.audioBuffer);
  const newAudioBuffer = getAudioContext().createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  expect(getAudioContext().decodeAudioData).toHaveBeenCalledTimes(1);
  await expect(audioBufferPromise).resolves.toBe(newAudioBuffer);
});
