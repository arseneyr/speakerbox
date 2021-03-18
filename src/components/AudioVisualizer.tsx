import { useForkRef } from "@material-ui/core";
import React, { HTMLProps, useEffect, useState } from "react";
import { useAudioContext } from "../containers/AudioContextProvider";
import { useSize } from "../hooks";

const BIN_COUNT = 32,
  BAR_WIDTH_FACTOR = 2,
  FFT_SIZE = 128;

interface AudioVisualizerProps extends HTMLProps<HTMLDivElement> {}

const AudioVisualizer = React.forwardRef<HTMLDivElement, AudioVisualizerProps>(
  (props, ref) => {
    const { ...rest } = props;
    const { analyzer } = useAudioContext();
    const [resizeRef, divWidth, divHeight] = useSize();
    const divRef = useForkRef<HTMLDivElement>(resizeRef, ref);
    const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (!canvasRef || !divWidth || !divHeight) {
        return;
      }

      const width = Math.max(divWidth, BIN_COUNT);
      const height = divHeight;
      const margin = Math.floor(
        width / (BIN_COUNT * BAR_WIDTH_FACTOR + (BIN_COUNT - 1))
      );
      const barWidth = margin * BAR_WIDTH_FACTOR;

      canvasRef.width = width;
      canvasRef.height = height;

      analyzer.fftSize = FFT_SIZE;
      const canvasCtx = canvasRef.getContext("2d")!;
      const colorGradient = canvasCtx.createLinearGradient(0, height, 0, 0);
      colorGradient.addColorStop(0, "rgba(255,107,249,1)");
      colorGradient.addColorStop(1, "#FF7A9A");

      const freqs = new Uint8Array(BIN_COUNT);
      let stop = false;

      function draw() {
        if (stop) {
          return;
        }

        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.globalCompositeOperation = "source-over";
        analyzer.getByteFrequencyData(freqs);
        for (const [i, val] of freqs.entries()) {
          const barHeight = (val / 256) * height;
          canvasCtx.fillStyle = `rgba(255,255,255,${(0.5 * val) / 255 + 0.5})`;
          canvasCtx.fillRect(
            i * (barWidth + margin),
            height - barHeight,
            barWidth,
            barHeight
          );
        }
        canvasCtx.globalCompositeOperation = "source-in";
        canvasCtx.fillStyle = colorGradient;
        canvasCtx.fillRect(0, 0, width, height);
        requestAnimationFrame(draw);
      }

      draw();

      return () => {
        stop = true;
      };
    }, [canvasRef, divWidth, divHeight, analyzer]);

    return (
      <div ref={divRef} {...rest}>
        <canvas ref={setCanvasRef} style={{ height: "100%", width: "100%" }} />
      </div>
    );
  }
);

export default AudioVisualizer;
