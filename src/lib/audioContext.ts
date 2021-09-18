let audioContext: AudioContext | null = null;
let gainNode: GainNode | undefined;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioContext.onstatechange = () => console.log(audioContext!.state);
  }
  return audioContext;
}

function addSourceToAudioContext(
  source: HTMLAudioElement | AudioBufferSourceNode
): () => void {
  if (!gainNode) {
    gainNode = new GainNode(getAudioContext(), { gain: _volume });
    gainNode.connect(getAudioContext().destination);
  }
  const sourceNode =
    source instanceof HTMLAudioElement
      ? new MediaElementAudioSourceNode(getAudioContext(), {
          mediaElement: source,
        })
      : source;
  sourceNode.connect(gainNode);
  return () => sourceNode.disconnect();
}

let _volume = 1;

function setVolume(volume: number): void {
  if (!gainNode) {
    _volume = volume;
    return;
  }
  volume === 0
    ? (gainNode.gain.value = 0)
    : gainNode.gain.exponentialRampToValueAtTime(volume, 0.1);
}

export { getAudioContext, addSourceToAudioContext, setVolume };
