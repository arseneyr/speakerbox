let audioContext: AudioContext | null = null;
let gainNode: GainNode | undefined;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    gainNode = new GainNode(audioContext);
    gainNode.connect(audioContext.destination);
    audioContext.onstatechange = () => console.log(audioContext!.state);
  }
  return audioContext;
}

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
  getAudioContext();
  volume === 0
    ? (gainNode!.gain.value = 0)
    : gainNode!.gain.exponentialRampToValueAtTime(volume, 0.1);
}

export { getAudioContext, addSourceToAudioContext, setVolume };
