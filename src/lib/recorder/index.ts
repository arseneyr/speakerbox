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
    stream.getTracks().forEach((t) => t.stop());
    throw new NoAudioTracksError();
  }
  return stream;
}

interface Recorder {
  buffer: Promise<ArrayBuffer>;
  stop: () => void;
}

async function startAudioRecording(): Promise<Recorder> {
  const recorder = new AudioRecorder();
  const stream = await getStream();
  return {
    buffer: recorder.startRecording(stream),
    stop: () => {
      recorder.stopRecording();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export { startAudioRecording, PermissionDeniedError, NoAudioTracksError };
