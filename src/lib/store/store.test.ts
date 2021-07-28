import inMemory from "./inMemory";
import { initialize, SampleStore } from "./sampleStore";
import { waitForValue } from "$lib/utils";
import audioContext from "$lib/audioContext";
import { firstValueFrom, of } from "rxjs";
import { shareReplay } from "rxjs/operators";

jest.mock("./inMemory", () => {
  const original = jest.requireActual("./inMemory").default;
  const ret = {};
  Object.entries(original).forEach(
    ([key, prop]) =>
      typeof prop === "function" && (ret[key] = jest.fn(original[key]))
  );
  return ret;
});

beforeEach(() => {
  audioContext.decodeAudioData.mockClear();
});

beforeAll(() => initialize(inMemory));

test("main saved data loaded", () => {
  expect(inMemory.getMainState).toHaveBeenCalledTimes(1);
});

test("creating new sample from arraybuffer", async () => {
  const [encoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(encoded, "test title");
  await expect(waitForValue(sample.title)).resolves.toBe("test title");
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

  const allAudioBuffers = sample.audioBuffer.pipe(shareReplay(2));
  allAudioBuffers.subscribe();

  const [encodedSecond, decodedSecond] = WebAudioTestAPI.createEncodedBuffer();

  sample["_encodedAudio$"].next(() => of(encodedSecond));
  await expect(firstValueFrom(allAudioBuffers)).resolves.toBe(decodedSecond);
});

test("setting audiobuffer does not cause decoding", async () => {
  const [encoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(encoded);
  audioContext.decodeAudioData.mockClear();
  const newAudioBuffer = audioContext.createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  expect(audioContext.decodeAudioData).not.toHaveBeenCalled();
  await expect(firstValueFrom(sample.audioBuffer)).resolves.toBe(
    newAudioBuffer
  );
});

test("setting audiobuffer cancels decoding properly", async () => {
  const [encoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(encoded);

  const allAudioBuffers = sample.audioBuffer.pipe(shareReplay(2));
  allAudioBuffers.subscribe();

  const newAudioBuffer = audioContext.createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  await expect(firstValueFrom(allAudioBuffers)).resolves.toBe(newAudioBuffer);
});

test("audio decoding doesn't happen if not subscribed", async () => {
  const [encoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = SampleStore.createNewSample(new Blob([encoded]));
  await expect(firstValueFrom(sample.player)).resolves.toBeDefined();

  expect(audioContext.decodeAudioData).not.toHaveBeenCalled();
});
