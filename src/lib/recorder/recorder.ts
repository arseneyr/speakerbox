import workletUrl from "./worklet.ts?url";
import wasmUrl from "../../../node_modules/wasm-media-encoders/wasm/ogg.wasm?url";
import { Deferred } from "$lib/utils";
import { getAudioContext } from "$lib/audioContext";

export class AudioRecorder {
  private static worklet: Promise<void>;
  private static wasmModule: Promise<WebAssembly.Module>;

  private node?: AudioWorkletNode;
  private deferred?: Deferred<ArrayBuffer | null>;
  private nodeReady?: Deferred<void>;

  public constructor() {
    if (!AudioRecorder.worklet) {
      AudioRecorder.worklet = getAudioContext().audioWorklet.addModule(
        workletUrl
      );
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

  public async startRecording(stream: MediaStream): Promise<ArrayBuffer> {
    await AudioRecorder.worklet;

    this.nodeReady = new Deferred();
    this.node = new AudioWorkletNode(getAudioContext(), "audio_scraper", {
      numberOfOutputs: 0,
      processorOptions: {
        wasmModule: await AudioRecorder.wasmModule,
      },
    });
    await this.nodeReady;

    this.deferred = new Deferred();
    this.node.port.onmessage = this.onNodeMessage;
    stream
      .getVideoTracks()?.[0]
      .addEventListener("ended", this.stopRecording.bind(this));
    getAudioContext().createMediaStreamSource(stream).connect(this.node);
    return this.deferred.promise;
  }

  public stopRecording(): void {
    if (this.nodeReady) {
      delete this.nodeReady;
      this.node?.port.postMessage(null);
    }
  }
}
