// eslint-disable-next-line import/no-webpack-loader-syntax
import workletUrl from "worker-plugin/loader!./worklet.ts";
// eslint-disable-next-line import/no-webpack-loader-syntax
import wasmUrl from "!!file-loader?name=static/js/[hash].wasm!./lame.wasm";
import { Deferred } from "../globalTypes";

const audioContext = new AudioContext();

export class AudioRecorder {
  private static worklet: Promise<void>;
  private static wasmModule: Promise<WebAssembly.Module>;

  private node?: AudioWorkletNode;
  private deferred?: Deferred<ArrayBuffer | null>;
  private nodeReady?: Deferred<void>;

  public constructor() {
    if (!AudioRecorder.worklet) {
      AudioRecorder.worklet = audioContext.audioWorklet.addModule(workletUrl);
    }
    if (!AudioRecorder.wasmModule) {
      AudioRecorder.wasmModule = WebAssembly.compileStreaming(fetch(wasmUrl));
    }
  }

  private onNodeMessage = ({ data }: MessageEvent) => {
    if (data === "ready") {
      this.nodeReady?.resolve();
      return;
    }
    if (!this.deferred) {
      return;
    }
    this.deferred.resolve(data);
    delete this.deferred;
  };

  public async startRecording(stream: MediaStream) {
    await AudioRecorder.worklet;

    this.nodeReady = new Deferred();
    this.node = new AudioWorkletNode!(audioContext, "audio_scraper", {
      numberOfOutputs: 0,
      processorOptions: {
        wasmModule: await AudioRecorder.wasmModule,
      },
    });
    await this.nodeReady;

    this.deferred = new Deferred();
    this.node.port.onmessage = this.onNodeMessage;
    stream.getVideoTracks()?.[0].addEventListener("ended", this.stopRecording);
    audioContext.createMediaStreamSource(stream).connect(this.node);
    return this.deferred.promise;
  }

  public stopRecording = () => {
    if (this.nodeReady) {
      delete this.nodeReady;
      this.node?.port.postMessage(null);
    }
  };
}
