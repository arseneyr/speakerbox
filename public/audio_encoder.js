import lamejs from "./lamejs.min.js";

const SILENCE_THRESHOLD = 1e-4;

class MyWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // eslint-disable-next-line no-undef
    this.encoder = new lamejs.Mp3Encoder(2, sampleRate, 128);
    this.buffer = new Int8Array(1024 * 256);
    this.offset = 0;
    this.silence = true;
    this.done = false;
    this.port.onmessage = () => {
      if (this.silence || this.done) {
        this.port.postMessage(null);
        return;
      }
      this.done = true;
      this.appendData(this.encoder.flush());
      const trimmedBuffer = new ArrayBuffer(this.offset);
      new Int8Array(trimmedBuffer).set(
        new Int8Array(this.buffer.buffer, 0, this.offset)
      );
      this.port.postMessage(trimmedBuffer, trimmedBuffer);
    };
  }
  floatArray2Int16(floatbuffer) {
    var int16Buffer = new Int16Array(floatbuffer.length);
    for (var i = 0, len = floatbuffer.length; i < len; i++) {
      if (floatbuffer[i] < 0) {
        int16Buffer[i] = 0x8000 * floatbuffer[i];
      } else {
        int16Buffer[i] = 0x7fff * floatbuffer[i];
      }
    }
    return int16Buffer;
  }
  appendData(data) {
    while (data.byteLength + this.offset > this.buffer.byteLength) {
      const newBuf = new Int8Array(this.buffer.length * 2);
      newBuf.set(this.buffer);
      this.buffer = newBuf;
    }

    this.buffer.set(data, this.offset);
    this.offset += data.byteLength;
  }

  process(inputs, outputs, parameters) {
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

    this.appendData(
      this.encoder.encodeBuffer(
        this.floatArray2Int16(inputs[0][0]),
        this.floatArray2Int16(inputs[0][1])
      )
    );
    return true;
  }
}

registerProcessor("audio_scraper", MyWorkletProcessor);
