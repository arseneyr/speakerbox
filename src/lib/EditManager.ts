// import { derived, writable } from "svelte/store";
import { assert, privateWritable } from "./utils";

interface Action {
  type: "cut" | "crop";
  startTime: number;
  endTime: number;
}

interface PrivateAction extends Action {
  startSample: number;
  endSample: number;
}

interface GatherItem {
  startSample: number;
  endSample: number;
}

function updateGatherList(
  gatherList: GatherItem[],
  action: PrivateAction,
): GatherItem[] {
  if (action.startSample === action.endSample) {
    if (action.type === "cut") {
      return gatherList;
    } else if (action.type === "crop") {
      return [];
    }
  }
  let curStart = 0;
  let startSample: number | undefined,
    endSample: number | undefined,
    startIndex: number | undefined,
    endIndex: number | undefined = undefined;
  for (const [i, gatherItem] of gatherList.entries()) {
    const curEnd = curStart + (gatherItem.endSample - gatherItem.startSample);

    if (action.startSample >= curStart && action.startSample < curEnd) {
      assert(startIndex === undefined);
      startSample = action.startSample - curStart + gatherItem.startSample;
      startIndex = i;
    }

    if (action.endSample >= curStart && action.endSample <= curEnd) {
      endSample = action.endSample - curStart + gatherItem.startSample;
      endIndex = i;
      break;
    }

    curStart = curEnd;
  }

  assert(startIndex !== undefined);
  assert(startSample !== undefined);
  assert(endIndex !== undefined);
  assert(endSample !== undefined);
  if (action.type === "crop") {
    gatherList[startIndex].startSample = startSample;
    gatherList[endIndex].endSample = endSample;
  } else if (action.type === "cut") {
    if (startIndex === endIndex) {
      // [           ] cut with    [   ]     becomes
      // [  ]   [    ]
      gatherList.splice(endIndex + 1, 0, { ...gatherList[startIndex] });
      endIndex += 1;
    }
    gatherList[endIndex].startSample = endSample;
    gatherList[startIndex].endSample = startSample;
    gatherList.splice(startIndex, endIndex - startIndex - 1);
  }

  return gatherList;
}

function applyActions(
  buffer: AudioBuffer,
  actions: PrivateAction[],
): AudioBuffer {
  const gatherList = actions.reduce(updateGatherList, [
    { startSample: 0, endSample: buffer.length },
  ]);
  const outputSize = gatherList.reduce(
    (acc, cur) => acc + (cur.endSample - cur.startSample),
    0,
  );
  const newAudioBuffer = new AudioBuffer({
    length: outputSize,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let i = 0; i < buffer.numberOfChannels; ++i) {
    let offset = 0;
    const channelData = buffer.getChannelData(i);
    for (const { startSample, endSample } of gatherList) {
      endSample > startSample &&
        newAudioBuffer.copyToChannel(
          channelData.subarray(startSample, endSample),
          i,
          offset,
        );
      offset += endSample - startSample;
    }
  }
  return newAudioBuffer;
}

class EditManager {
  private _originalAudioBuffer!: AudioBuffer;
  private _undoStack = writable<PrivateAction[]>([]);
  private _redoStack = writable<PrivateAction[]>([]);

  public undoable = derived(this._undoStack, (v) => v.length > 0);
  public redoable = derived(this._redoStack, (v) => v.length > 0);

  public audioBuffer = privateWritable<AudioBuffer | null>(null);

  loadData(audioBuffer: AudioBuffer): void {
    this._originalAudioBuffer = audioBuffer;
    this._audioBuffer = audioBuffer;
  }

  private _audioBufferBackend!: AudioBuffer;
  private set _audioBuffer(newVal: AudioBuffer) {
    this._audioBufferBackend = newVal;
    this.audioBuffer._set(newVal);
  }
  private get _audioBuffer() {
    return this._audioBufferBackend;
  }

  private normalize(action: Action): PrivateAction {
    const startTime = Math.min(
      Math.max(action.startTime, 0),
      this._audioBuffer.duration,
    );
    const endTime = Math.min(
      this._audioBuffer.duration,
      Math.max(action.endTime, startTime),
    );
    return {
      ...action,
      startTime,
      endTime,
      startSample: Math.floor(startTime * this._audioBuffer.sampleRate),
      endSample: Math.floor(endTime * this._audioBuffer.sampleRate),
    };
  }

  private _doAction(action: PrivateAction): void {
    this._undoStack.update((undos) => undos.concat(action));
    this._audioBuffer = applyActions(this._audioBuffer, [action]);
  }

  cut(start: number, end: number): void {
    this._redoStack.set([]);
    this._doAction(
      this.normalize({ type: "cut", startTime: start, endTime: end }),
    );
  }
  crop(start: number, end: number): void {
    this._redoStack.set([]);
    this._doAction(
      this.normalize({ type: "crop", startTime: start, endTime: end }),
    );
  }
  undo(): Action | null {
    let action: PrivateAction | null = null;
    this._undoStack.update((stack) => {
      action = stack.pop() ?? null;

      assert(action);

      if (action) {
        this._redoStack.update((redoStack) => {
          redoStack.push(action!);
          return redoStack;
        });

        this._audioBuffer =
          stack.length === 0
            ? this._originalAudioBuffer
            : applyActions(this._originalAudioBuffer, stack);
      }
      return stack;
    });
    return action;
  }

  redo(): void {
    let action: PrivateAction | undefined;
    this._redoStack.update((stack) => {
      action = stack.pop();
      return stack;
    });

    assert(action);

    if (action) {
      this._doAction(action);
    }
  }
}

export default EditManager;
