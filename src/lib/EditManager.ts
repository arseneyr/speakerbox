import { derived, readable, Subscriber, writable } from "svelte/store";

interface Action {
  type: "cut" | "crop";
  start: number;
  end: number;
}

interface PrivateAction extends Action {
  startSample: number;
  endSample: number;
}

interface GatherItem {
  startSample: number;
  endSample: number;
}

class EditManager {
  private _setAudioBuffer: Subscriber<AudioBuffer> | null = null;
  private _audioBufferBackend: AudioBuffer;
  private _originalAudioBuffer;
  private _undoStack = writable<PrivateAction[]>([]);
  private _redoStack = writable<PrivateAction[]>([]);

  public undoable = derived(this._undoStack, (v) => v.length > 0);
  public redoable = derived(this._redoStack, (v) => v.length > 0);

  public audioBuffer = readable<AudioBuffer | null>(null, (set) => {
    this._setAudioBuffer = set;
    this._setAudioBuffer(this._audioBufferBackend);
    return () => (this._setAudioBuffer = null);
  });

  async loadData(audioData: ArrayBuffer): Promise<void> {
    const buf = await new AudioContext().decodeAudioData(audioData);
    this._originalAudioBuffer = buf;
    this._audioBuffer = buf;
  }

  private set _audioBuffer(newVal: AudioBuffer) {
    this._audioBufferBackend = newVal;
    this._setAudioBuffer?.(newVal);
  }
  private get _audioBuffer() {
    return this._audioBufferBackend;
  }

  private normalize(start: number, end: number): Omit<PrivateAction, "type"> {
    start = Math.max(start, 0);
    end = Math.min(this._audioBuffer.duration, end);
    return {
      start,
      end,
      startSample: Math.floor(start * this._audioBuffer.sampleRate),
      endSample: Math.floor(end * this._audioBuffer.sampleRate),
    };
  }

  private _cut(action: PrivateAction): void {
    this._undoStack.update((undos) => undos.concat(action));

    const newBuffer = new AudioBuffer({
      numberOfChannels: this._audioBuffer.numberOfChannels,
      sampleRate: this._audioBuffer.sampleRate,
      length: this._audioBuffer.length - action.endSample + action.startSample,
    });

    for (let i = 0; i < newBuffer.numberOfChannels; ++i) {
      const channelData = this._audioBuffer.getChannelData(i);
      newBuffer.copyToChannel(channelData.subarray(0, action.startSample), i);
      newBuffer.copyToChannel(
        channelData.subarray(action.endSample),
        i,
        action.startSample
      );
    }
    this._audioBuffer = newBuffer;
  }
  private _crop(action: PrivateAction): void {
    this._undoStack.update((undos) => undos.concat(action));

    const newBuffer = new AudioBuffer({
      numberOfChannels: this._audioBuffer.numberOfChannels,
      sampleRate: this._audioBuffer.sampleRate,
      length: action.endSample - action.startSample,
    });

    for (let i = 0; i < newBuffer.numberOfChannels; ++i) {
      newBuffer.copyToChannel(
        this._audioBuffer
          .getChannelData(i)
          .subarray(action.startSample, action.endSample),
        i
      );
    }
    this._audioBuffer = newBuffer;
  }

  cut(start: number, end: number): void {
    this._redoStack.set([]);
    this._cut({ type: "cut", ...this.normalize(start, end) });
  }
  crop(start: number, end: number): void {
    this._redoStack.set([]);
    this._crop({ type: "crop" as const, ...this.normalize(start, end) });
  }
  undo(): Action | null {
    let action: PrivateAction | null = null;
    let gatherList: GatherItem[];
    this._undoStack.update((stack) => {
      action = stack.pop() ?? null;
      if (action) {
        gatherList = this.buildGatherList(stack);
      }
      return stack;
    });
    if (action) {
      this._redoStack.update((stack) => {
        stack.push(action);
        return stack;
      });
      const outputSize = gatherList.reduce(
        (acc, cur) => acc + (cur.endSample - cur.startSample),
        0
      );
      const newAudioBuffer = new AudioBuffer({
        length: outputSize,
        numberOfChannels: this._originalAudioBuffer.numberOfChannels,
        sampleRate: this._originalAudioBuffer.sampleRate,
      });
      for (let i = 0; i < this._originalAudioBuffer.numberOfChannels; ++i) {
        let offset = 0;
        const channelData = this._originalAudioBuffer.getChannelData(i);
        for (const { startSample, endSample } of gatherList) {
          newAudioBuffer.copyToChannel(
            channelData.subarray(startSample, endSample),
            i,
            offset
          );
          offset += endSample - startSample;
        }
      }
      this._audioBuffer = newAudioBuffer;
    }
    return action;
  }

  redo(): void {
    let action: PrivateAction | undefined;
    this._redoStack.update((stack) => {
      action = stack.pop();
      return stack;
    });
    if (action?.type === "cut") {
      this._cut(action);
    } else if (action?.type === "crop") {
      this._crop(action);
    }
  }

  private buildGatherList(actions: PrivateAction[]): GatherItem[] {
    // Note that the gather list is in original buffer sample units. The actions
    // are in sample units relative to the modified buffer at the time of the
    // action.
    return actions.reduce(
      (gatherList, action) => {
        let totalSamples = 0;
        let startSample, endSample, startIndex, endIndex;
        for (const [i, gatherItem] of gatherList.entries()) {
          const curSamples = gatherItem.endSample - gatherItem.startSample;
          if (
            action.startSample >= totalSamples &&
            action.startSample < totalSamples + curSamples
          ) {
            startSample =
              action.startSample - totalSamples + gatherItem.startSample;
            startIndex = i;
          }
          if (
            action.endSample >= totalSamples &&
            action.endSample < totalSamples + curSamples
          ) {
            endSample =
              action.endSample - totalSamples + gatherItem.startSample;
            endIndex = i;
            break;
          }

          totalSamples += curSamples;
        }

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
      },
      [{ startSample: 0, endSample: this._originalAudioBuffer.length }]
    );
  }
}

export default EditManager;
