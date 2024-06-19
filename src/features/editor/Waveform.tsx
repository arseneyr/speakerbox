import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { Region } from "wavesurfer.js/plugins/regions";

interface WaveformProps {
  initialTitle: string;
  id: string;
  mediaElement: HTMLAudioElement;
}

export const Waveform: React.FunctionComponent<WaveformProps> = (props) => {
  const ref = useRef<{ ws: WaveSurfer; region: Region | null }>();
  function createWavesurfer(el: HTMLDivElement) {
    if (!el) {
      ref.current?.ws.destroy();
      ref.current = undefined;
      return;
    }
    const regionsPlugin = RegionsPlugin.create();
    ref.current = {
      ws: new WaveSurfer({
        container: el,
        media: props.mediaElement,
        plugins: [regionsPlugin],
      }),
      region: null,
    };
    ref.current.ws.on("click", () => regionsPlugin.clearRegions());
    regionsPlugin.on("region-created", (region) => {
      ref.current && (ref.current.region = region);
    });
    regionsPlugin.enableDragSelection({});
  }
  useEffect(() => {
    ref.current && ref.current.ws.setMediaElement(props.mediaElement);
  }, [props.mediaElement]);
  return <div className="w-full bg-neutral" ref={createWavesurfer} onFocusOu={} />;
};
