//import { AudioContext, AudioWorkletNode } from "standardized-audio-context";
import { Deferred } from "../globalTypes";

const audioContext = new AudioContext();

export async function decodeAudioData(buffer: ArrayBuffer) {
  return audioContext.decodeAudioData(buffer);
}

export function createAudioBuffer(
  numberOfChannels: number,
  length: number,
  sampleRate: number
): AudioBuffer {
  return audioContext.createBuffer(numberOfChannels, length, sampleRate);
}

export function sliceAudioBuffer(
  buffer: AudioBuffer,
  begin: number,
  end: number
) {
  const duration = buffer.duration;
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;

  if (begin < 0) {
    throw new RangeError("begin time must be greater than 0");
  }

  if (end > duration) {
    throw new RangeError("end time must be less than or equal to " + duration);
  }

  const startOffset = rate * begin;
  const endOffset = rate * end;
  const newAudioBuffer = audioContext.createBuffer(
    channels,
    endOffset - startOffset,
    rate
  );

  for (let channel = 0; channel < channels; channel++) {
    newAudioBuffer.copyToChannel(
      buffer.getChannelData(channel).subarray(startOffset, endOffset),
      channel,
      0
    );
  }
  return newAudioBuffer;
}

export class AudioRecorder {
  private static readonly worklet = Promise.all([
    audioContext.audioWorklet.addModule(
      process.env.PUBLIC_URL + "/audio_scraper.js"
    ),
    audioContext.audioWorklet.addModule(
      process.env.PUBLIC_URL + "/OggVorbisEncoder.min.js"
    ),
  ]);

  private node?: AudioWorkletNode;
  private deferred?: Deferred<AudioBuffer | null>;

  private onNodeMessage = ({ data }: MessageEvent) => {
    if (!this.deferred) {
      return;
    }
    if (data === null) {
      this.deferred?.resolve(null);
      return;
    }
    const audioBuffer = new AudioBuffer({
      length: data[0].byteLength / 4,
      numberOfChannels: 2,
      sampleRate: 48000,
    });
    (data as ArrayBuffer[]).forEach((b, i) =>
      audioBuffer.copyToChannel(new Float32Array(b), i)
    );
    this.deferred?.resolve(audioBuffer);
    delete this.deferred;
  };

  public async startRecording(stream: MediaStream) {
    await AudioRecorder.worklet;

    this.node = new AudioWorkletNode!(audioContext, "audio_scraper", {
      numberOfOutputs: 0,
    });
    this.deferred = new Deferred();
    this.node.port.onmessage = this.onNodeMessage;
    stream.getVideoTracks()?.[0].addEventListener("ended", this.stopRecording);
    audioContext.createMediaStreamSource(stream).connect(this.node);
    return this.deferred.promise;
  }

  public stopRecording = () => {
    if (this.deferred) {
      this.node?.port.postMessage("");
    }
  };
}
