let audioContext: AudioContext | null = null;
let gainNode: GainNode | undefined;
const outputAudioElement = new Audio();
let _volume = 1;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioContext.onstatechange = () => console.log(audioContext!.state);
    gainNode = new GainNode(getAudioContext(), { gain: _volume });
    const destinationNode = new MediaStreamAudioDestinationNode(
      getAudioContext()
    );
    outputAudioElement.srcObject = destinationNode.stream;
    gainNode.connect(destinationNode);
    outputAudioElement.play();
    // gainNode.connect(audioContext.destination);
  }
  return audioContext;
}

function setSink(deviceId: string): Promise<undefined> | undefined {
  return (outputAudioElement as any).setSinkId?.(deviceId);
}

// Potential workaround for this bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1157478#c8
// function playSilence() {}

function addSourceToAudioContext(
  source: HTMLAudioElement | AudioBufferSourceNode
): () => void {
  const sourceNode =
    source instanceof HTMLAudioElement
      ? new MediaElementAudioSourceNode(getAudioContext(), {
          mediaElement: source,
        })
      : source;
  sourceNode.connect(gainNode!);
  return () => sourceNode.disconnect();
}

function setVolume(volume: number): void {
  if (!gainNode) {
    _volume = volume;
    return;
  }
  volume === 0
    ? (gainNode.gain.value = 0)
    : gainNode.gain.exponentialRampToValueAtTime(volume, 0.1);
}

export { getAudioContext, addSourceToAudioContext, setVolume, setSink };
