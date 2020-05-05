import { AudioContext } from "standardized-audio-context";

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
