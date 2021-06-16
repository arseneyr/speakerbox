import { AudioRecorder } from "./recorder";

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
    stream = (await (navigator.mediaDevices as any).getDisplayMedia({
      audio: true,
      video: true,
    })) as MediaStream;
  } catch (e) {
    throw new PermissionDeniedError();
  }
  if (stream.getAudioTracks().length === 0) {
    throw new NoAudioTracksError();
  }
  return stream;
}

interface Recorder {
  buffer: Promise<ArrayBuffer>;
  stop: () => void;
}

function startAudioRecording(): Recorder {
  const recorder = new AudioRecorder();
  const stream = getStream();
  return {
    buffer: stream.then((s) => recorder.startRecording(s)),
    stop: () => {
      recorder.stopRecording();
      stream.then((s) => s.getVideoTracks().forEach((t) => t.stop()));
    },
  };
}

export { startAudioRecording, PermissionDeniedError, NoAudioTracksError };
