import EditManager from "./EditManager";
import { get } from "svelte/store";

(global as any).WebAudioTestAPI.setState({
  "AudioBuffer#copyToChannel": "enabled",
  "AudioContext#decodeAudioData": "promise",
});

let manager: EditManager;

const globalContext: AudioContext & {
  DECODE_AUDIO_DATA_RESULT: AudioBuffer;
} = new AudioContext() as any;

global.AudioContext = function () {
  return globalContext;
} as any;

const testBuffer = globalContext.createBuffer(2, 44100 * 10, 44100);
for (let i = 0; i < testBuffer.numberOfChannels; ++i) {
  testBuffer.copyToChannel(
    Float32Array.from({ length: testBuffer.length }, () => Math.random()),
    i
  );
}
globalContext.DECODE_AUDIO_DATA_RESULT = testBuffer;

beforeEach(async () => {
  manager = new EditManager();
  await manager.loadData(testBuffer);
});

// test("decodes properly", () => {
//   const decodedBuffer = get(manager.audioBuffer);
//   expect(decodedBuffer.length).toBe(testBuffer.length);
//   expect(decodedBuffer.numberOfChannels).toBe(testBuffer.numberOfChannels);
//   expect(decodedBuffer.sampleRate).toBe(testBuffer.sampleRate);
//   expect(decodedBuffer.duration).toBe(testBuffer.duration);
//   for (let i = 0; i < decodedBuffer.numberOfChannels; ++i) {
//     expect(decodedBuffer.getChannelData(i)).toEqual(
//       globalContext.DECODE_AUDIO_DATA_RESULT.getChannelData(i)
//     );
//   }
// });

test.skip("yo", () => {});
