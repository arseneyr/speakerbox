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
const TOTAL_STACK = 5 * 1024 * 1024;
const TOTAL_MEMORY = 16 * 1024 * 1024;
const WASM_PAGE_SIZE = 64 * 1024;

class MyWorkletProcessor extends AudioWorkletProcessor {
  private static wasmPromise: Promise<WebAssembly.Instance>;
  private static memory = new WebAssembly.Memory({
    initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
    maximum: TOTAL_MEMORY / WASM_PAGE_SIZE,
  });
  private FFI: any;
  private done = false;
  private silence = true;
  private offset = 0;
  private buffers: ArrayBuffer[];
  private ref!: number;
  private pcm_l!: Float32Array;
  public constructor(args: { processorOptions: ProcessorArgs }) {
    super();
    if (!MyWorkletProcessor.wasmPromise) {
      MyWorkletProcessor.wasmPromise = MyWorkletProcessor.instantitate(
        args.processorOptions.wasmModule
      );
    }
    MyWorkletProcessor.wasmPromise.then(this.onInstantiate);
    this.buffers = Array.from(Array(2), () => new ArrayBuffer(48000 * 10 * 4));
    this.port.onmessage = this.onMessage;
  }

  private static instantitate(wasmModule: WebAssembly.Module) {
    let dynamicTop = TOTAL_STACK;
    function sbrk(increment: number) {
      const oldDynamicTop = dynamicTop;
      dynamicTop += increment;
      return oldDynamicTop;
    }
    function exit(status: number) {
      console.error(`LAME exited with status ${status}`);
    }

    const imports = {
      env: {
        memory: MyWorkletProcessor.memory,
        pow: Math.pow,
        powf: Math.pow,
        exp: Math.exp,
        sqrtf: Math.sqrt,
        cos: Math.cos,
        log: Math.log,
        sin: Math.sin,
        sbrk,
        exit,
      },
    };
    return WebAssembly.instantiate(wasmModule, imports);
  }

  private onInstantiate = (instance: WebAssembly.Instance) => {
    this.FFI = instance.exports;
    this.ref = this.FFI.vmsg_init(sampleRate);

    const pcm_l_ref = new Uint32Array(
      MyWorkletProcessor.memory.buffer,
      this.ref,
      1
    )[0];
    this.pcm_l = new Float32Array(MyWorkletProcessor.memory.buffer, pcm_l_ref);
    this.port.postMessage("ready");
  };
  private onMessage = () => {
    debugger;
    this.done = true;
    if (this.silence) {
      this.port.postMessage(null);
      return;
    }
    if (this.FFI.vmsg_flush(this.ref) < 0) return null;
    const mp3_ref = new Uint32Array(
      MyWorkletProcessor.memory.buffer,
      this.ref + 4,
      1
    )[0];
    const size = new Uint32Array(
      MyWorkletProcessor.memory.buffer,
      this.ref + 8,
      1
    )[0];
    const returnBuffer = new ArrayBuffer(size);
    new Uint8Array(returnBuffer).set(
      new Uint8Array(MyWorkletProcessor.memory.buffer, mp3_ref, size)
    );
    this.port.postMessage(returnBuffer, [returnBuffer]);
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

    this.pcm_l.set(inputs[0][0]);
    this.FFI.vmsg_encode(this.ref, inputs[0][0].length);

    return true;
  }
}

registerProcessor("audio_scraper", MyWorkletProcessor);

export {};
