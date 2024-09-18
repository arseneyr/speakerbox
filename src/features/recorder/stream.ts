declare global {
  interface MediaTrackConstraints {
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    googNoiseSuppression?: boolean;
    googAutoGainControl?: boolean;
    mozNoiseSuppression?: boolean;
    mozAutoGainControl?: boolean;
    displaySurface?: "monitor";
  }
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  }
  interface DisplayMediaStreamOptions {
    systemAudio: "include" | "exclude";
    monitorTypeSurfaces: "include";
  }
  // interface MediaTrackConstraints {
  //   displaySurface: "monitor"
  // }
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
      video: {
        displaySurface: "monitor",
      },
      systemAudio: "include",
      monitorTypeSurfaces: "include",
    })) as MediaStream;
  } catch (e) {
    throw new PermissionDeniedError();
  }
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    stream.getTracks().forEach((t) => t.stop());
    throw new NoAudioTracksError();
  }
  return new MediaStream(audioTracks.slice(0, 1));
}

export { getStream, PermissionDeniedError, NoAudioTracksError };
