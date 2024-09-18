declare global {
  interface MediaRecorderOptions {
    audioBitrateMode: "variable" | "constant";
  }
}

const SUPPORTED_MIMETYPES = [
  "audio/webm; codecs=opus",
  "audio/ogg; codecs=opus",
];

function recorderSupported(): boolean {
  return SUPPORTED_MIMETYPES.some(MediaRecorder.isTypeSupported);
}

function recordStream(stream: MediaStream) {
  const mimeType = SUPPORTED_MIMETYPES.find(MediaRecorder.isTypeSupported);
  if (!mimeType) {
    throw new Error("recorder unsupported");
  }
  const recorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: 64 * 1024,
    audioBitrateMode: "variable",
  });

  const dataPromise = new Promise<Blob>((res, rej) => {
    recorder.ondataavailable = (ev) => res(ev.data);
    recorder.onerror = () => rej(new Error("recording error"));
  });

  const stop = () => {
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
  };
  stream.getTracks().forEach((t) => t.addEventListener("ended", stop));
  recorder.start();

  return {
    blob: dataPromise,
    stop,
  };
}

export { recorderSupported, recordStream };
