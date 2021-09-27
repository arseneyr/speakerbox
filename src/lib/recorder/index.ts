import { getAudioContext } from "$lib/audioContext";
import { Deferred } from "$lib/utils";

declare global {
  interface MediaTrackConstraints {
    noiseSuppression: boolean;
    autoGainControl?: boolean;
    googNoiseSuppression?: boolean;
    googAutoGainControl?: boolean;
    mozNoiseSuppression?: boolean;
    mozAutoGainControl?: boolean;
  }
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  }
}

class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
  }
}

class NoAudioTracksError extends Error {
  constructor() {
    super("No audio tracks");
  }
}

async function getStream() {
  let stream;
  try {
    stream = (await navigator.mediaDevices.getDisplayMedia({
      // shout out to
      // https://medium.com/@trystonperry/why-is-getdisplaymedias-audio-quality-so-bad-b49ba9cfaa83
      audio: {
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        mozAutoGainControl: false,
        mozNoiseSuppression: false,
      },
      video: true,
    })) as MediaStream;
  } catch (e) {
    throw new PermissionDeniedError();
  }
  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new NoAudioTracksError();
  }
  return stream;
}

interface Recorder {
  buffer: Promise<AudioBuffer | null>;
  stop: () => void;
}

// async function startAudioRecording(): Promise<Recorder> {
//   const recorder = new AudioRecorder();
//   const stream = await getStream();
//   return {
//     buffer: recorder.startRecording(stream),
//     stop: () => {
//       recorder.stopRecording();
//       stream.getTracks().forEach((t) => t.stop());
//     },
//   };
// }

const SILENCE_THRESHOLD = 1e-4;

async function postprocess(buf: ArrayBuffer): Promise<AudioBuffer | null> {
  const audioBuffer = await getAudioContext().decodeAudioData(buf);
  const channelData = Array.from(
    { length: audioBuffer.numberOfChannels },
    (i: number) => audioBuffer.getChannelData(i)
  );

  function isSampleSilent(sample: number) {
    for (let i = 0; i < channelData.length; ++i) {
      if (Math.abs(channelData[i][sample]) > SILENCE_THRESHOLD) {
        return false;
      }
    }
    return true;
  }

  let startSound = 0;
  for (; startSound < channelData[0].length; ++startSound) {
    if (!isSampleSilent(startSound)) {
      break;
    }
  }
  if (startSound === channelData[0].length) {
    return null;
  }
  let endSound = channelData[0].length - 1;
  for (; endSound >= 0; --endSound) {
    if (!isSampleSilent(endSound)) {
      break;
    }
  }

  const newAudioBuffer = new AudioBuffer({
    length: endSound - startSound,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
  });
  for (let i = 0; i < audioBuffer.numberOfChannels; ++i) {
    newAudioBuffer.copyToChannel(
      channelData[i].subarray(startSound, endSound + 1),
      i
    );
  }
  return newAudioBuffer;
}

async function startAudioRecording(): Promise<Recorder> {
  const stream = await getStream();
  const recorder = new MediaRecorder(stream, {
    mimeType: "audio/webm;codecs=pcm",
  });
  const buffer = new Deferred<AudioBuffer | null>();
  recorder.ondataavailable = async ({ data }) =>
    buffer.resolve(postprocess(await data.arrayBuffer()));

  const stop = () => {
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
  };
  stream.getTracks().forEach((t) => t.addEventListener("ended", stop));
  recorder.start();
  return {
    buffer: buffer.promise,
    stop,
  };
}

export { startAudioRecording, PermissionDeniedError, NoAudioTracksError };
