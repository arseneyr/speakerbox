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

test("undoable/redoable updates", () => {
  expect(get(manager.undoable)).toBe(false);
  expect(get(manager.redoable)).toBe(false);

  manager.cut(1, 5);
  expect(get(manager.undoable)).toBe(true);
  expect(get(manager.redoable)).toBe(false);

  manager.undo();
  expect(get(manager.undoable)).toBe(false);
  expect(get(manager.redoable)).toBe(true);
});

test("undo returns state", () => {
  manager.cut(1, 5);
  expect(get(manager.audioBuffer)).not.toEqualAudioBuffer(testBuffer);
  manager.undo();
  expect(get(manager.audioBuffer)).toEqualAudioBuffer(testBuffer);
});

type Operation = ["cut" | "crop", number, number];

test.concurrent.each<Operation[][]>([
  [
    [
      ["cut", 4, 5],
      ["crop", 1, 9],
      ["cut", 0, 4],
    ],
  ],
  [
    [
      ["crop", 1, 2],
      ["crop", 3, 4],
    ],
  ],
  [[["cut", 1, 1]]],
  [[["crop", 5, 5]]],
  [
    [
      ["cut", -1, 2],
      ["crop", 0, 11],
    ],
  ],
])("%p", (operations) => {
  const manager = new EditManager();
  manager.loadData(testBuffer);

  for (const [type, start, end] of operations) {
    const oldBuffer = get(manager.audioBuffer);
    manager[type](start, end);
    const newBuffer = get(manager.audioBuffer);
    manager.undo();
    expect(get(manager.audioBuffer)).toEqualAudioBuffer(oldBuffer!);
    manager.redo();
    expect(get(manager.audioBuffer)).toEqualAudioBuffer(newBuffer!);
  }
});
