import { SampleStore } from "./sampleStore";
import { get } from "svelte/store";
import { waitForValue } from "$lib/utils";
import { getAudioContext } from "$lib/audioContext";

// jest.mock("../backend", () => {
//   const original = jest.requireActual("../backend").inMemory;
//   const ret = {};
//   Object.entries(original).forEach(
//     ([key, prop]) =>
//       typeof prop === "function" && (ret[key] = jest.fn(original[key]))
//   );
//   return { inMemory: ret };
// });

// jest.mock("./player", () => ({
//   ...jest.requireActual<any>("./player"),
//   // eslint-disable-next-line @typescript-eslint/no-empty-function
//   createEncodedPlayer: jest.fn(async () => ({ destroy: () => {} })),
// }));

jest.mock("../player");

beforeEach(() => {
  getAudioContext().decodeAudioData.mockClear();
});

test("creating new sample from blob", async () => {
  const sample = new SampleStore({
    data: new Blob(),
    title: "test title",
  });
  expect(get(sample.title)).toBe("test title");
  await expect(waitForValue(sample.player)).resolves.toBeDefined();
});

test("audioBuffer decoding works", async () => {
  const [encoded, decoded] = WebAudioTestAPI.createEncodedBuffer();
  const sample = new SampleStore({ data: new Blob([encoded]) });
  await expect(waitForValue(sample.audioBuffer)).resolves.toBe(decoded);
});

test("play/stop works", async () => {
  const sample = new SampleStore({ data: new Blob() });
  const player = await waitForValue(sample.player);
  expect(get(player.playing)).toBe(false);
  player.play();
  expect(get(player.playing)).toBe(true);
});

test("audioBuffer decoding is cancelled properly", async () => {
  const [encodedFirst] = WebAudioTestAPI.createEncodedBuffer();
  const sample = new SampleStore({ data: new Blob([encodedFirst]) });

  expect(getAudioContext().decodeAudioData).not.toHaveBeenCalled();
  const decodePromise = waitForValue(sample.audioBuffer);
  expect(getAudioContext().decodeAudioData).toHaveBeenCalledTimes(1);

  const [encodedSecond, decodedSecond] = WebAudioTestAPI.createEncodedBuffer();

  sample["_source"].set({ encoded: new Blob([encodedSecond]), decoded: null });
  await expect(decodePromise).resolves.toBe(decodedSecond);
});

test("setting audiobuffer does not cause decoding", () => {
  const sample = new SampleStore({ data: new Blob() });
  const newAudioBuffer = getAudioContext().createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  expect(getAudioContext().decodeAudioData).not.toHaveBeenCalled();
  expect(get(sample.audioBuffer)).toBe(newAudioBuffer);
});

test("setting audiobuffer cancels properly", async () => {
  const sample = new SampleStore({ data: new Blob() });
  const audioBufferPromise = waitForValue(sample.audioBuffer);
  const newAudioBuffer = getAudioContext().createBuffer(2, 44100 * 5, 44100);
  sample.setAudioBuffer(newAudioBuffer);

  expect(getAudioContext().decodeAudioData).toHaveBeenCalledTimes(1);
  await expect(audioBufferPromise).resolves.toBe(newAudioBuffer);
});
