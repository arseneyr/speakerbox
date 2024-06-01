import { createEncoder, WasmMediaEncoder } from "wasm-media-encoders/esnext";

declare global {
  interface IAudioWorkletProcessor {
    port: MessagePort;
    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
  }
  interface IAudioWorkletProcessorConstructor {
    new (): IAudioWorkletProcessor;
  }

  export const AudioWorkletProcessor: IAudioWorkletProcessorConstructor;
  export const registerProcessor: (...args: any) => void;
  export const sampleRate: number;
}

interface ProcessorArgs {
  wasmModule: WebAssembly.Module;
}

const SILENCE_THRESHOLD = 1e-4;

class MyWorkletProcessor extends AudioWorkletProcessor {
  private static encoderPromise: Promise<WasmMediaEncoder<"audio/ogg">>;
  private encoder!: WasmMediaEncoder<"audio/ogg">;
  private done = false;
  private silence = true;
  private offset = 0;
  private outBuffer = new Uint8Array(1024 * 1024);
  public constructor(args: { processorOptions: ProcessorArgs }) {
    super();
    if (!MyWorkletProcessor.encoderPromise) {
      MyWorkletProcessor.encoderPromise = createEncoder(
        "audio/ogg",
        args.processorOptions.wasmModule
      );
    }
    MyWorkletProcessor.encoderPromise.then(this.onInstantiate);
    this.port.onmessage = this.onMessage;
  }

  private onInstantiate = (encoder: WasmMediaEncoder<"audio/ogg">) => {
    // debugger;
    encoder.configure({
      sampleRate,
      channels: 2,
      vbrQuality: 3,
    });
    this.encoder = encoder;

    this.port.postMessage("ready");
  };
  private onMessage = () => {
    this.done = true;
    if (this.silence) {
      this.port.postMessage(null);
      return;
    }
    const mp3Data = this.encoder.finalize();
    const returnBuffer = new Uint8Array(this.offset + mp3Data.length);
    returnBuffer.set(new Uint8Array(this.outBuffer.buffer, 0, this.offset));
    returnBuffer.set(mp3Data, this.offset);
    this.port.postMessage(returnBuffer.buffer, [returnBuffer.buffer]);
  };

  public process(inputs: Float32Array[][]) {
    if (this.done) {
      // OK for audio framework to clean up this node
      return false;
    }

    if (this.silence) {
      if (
        inputs[0].every((a) => a.every((v) => Math.abs(v) < SILENCE_THRESHOLD))
      ) {
        // Keep audio node alive
        return true;
      }
      this.silence = false;
    }

    const mp3Data = this.encoder.encode(inputs[0]);
    while (mp3Data.length + this.offset > this.outBuffer.length) {
      const newBuffer = new Uint8Array(this.outBuffer.length * 2);
      newBuffer.set(this.outBuffer);
      this.outBuffer = newBuffer;
    }
    this.outBuffer.set(mp3Data, this.offset);
    this.offset += mp3Data.length;

    return true;
  }
}

registerProcessor("audio_scraper", MyWorkletProcessor);
