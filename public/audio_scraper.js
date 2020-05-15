const SILENCE_THRESHOLD = 1e-4;

class MyWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffers = Array.from(Array(2), () => new ArrayBuffer(48000 * 10 * 4));
    this.offset = 0;
    this.silence = true;
    this.done = false;
    this.port.onmessage = () => {
      this.done = true;
      if (this.silence) {
        this.port.postMessage(null);
        return;
      }
      let lastSound = 0;
      this.buffers
        .map((b) => new Float32Array(b))
        .forEach((a) => {
          for (let i = this.offset / 4 - 1; i >= 0; i--) {
            if (Math.abs(a[i]) >= SILENCE_THRESHOLD) {
              lastSound = Math.max(lastSound, i + 1);
              break;
            }
          }
        });
      const trimmedBuffers = this.buffers.map((b) => {
        const newBuf = new Float32Array(lastSound);
        newBuf.set(new Float32Array(b, 0, newBuf.length));
        return newBuf.buffer;
      });
      this.port.postMessage(trimmedBuffers, trimmedBuffers);
    };
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

    const len = inputs[0][0].byteLength;
    if (this.offset + len > this.buffers[0].byteLength) {
      this.buffers = this.buffers.map((b) => {
        const newBuf = new ArrayBuffer(b.byteLength * 2);
        new Float32Array(newBuf).set(new Float32Array(b));
        return newBuf;
      });
    }

    this.buffers.forEach((b, i) => {
      new Float32Array(b, this.offset, inputs[0][i].length).set(inputs[0][i]);
    });
    this.offset += len;
    return true;
  }
}

registerProcessor("audio_scraper", MyWorkletProcessor);
