declare global {
  const WebAudioTestAPI: {
    createEncodedBuffer: () => [ArrayBuffer, AudioBuffer];
    setState: any;
  };
  interface AudioContext {
    decodeAudioData: jest.Mock<Promise<AudioBuffer>, [ArrayBuffer]>;
  }
}

type TypedArray =
  | {
      buffer: ArrayBuffer;
      byteLength: number;
    }
  | ArrayBuffer;

function bufferEqual(buf1: TypedArray, buf2: TypedArray) {
  if (buf1.byteLength != buf2.byteLength) return false;
  const ta1 = new Int8Array(buf1 instanceof ArrayBuffer ? buf1 : buf1.buffer);
  const ta2 = new Int8Array(buf2 instanceof ArrayBuffer ? buf2 : buf2.buffer);
  for (let i = 0; i != ta1.length; i++) {
    if (ta1[i] != ta2[i]) return false;
  }
  return true;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualAudioBuffer(expected: AudioBuffer): R;
    }
  }
}

expect.extend({
  toEqualAudioBuffer(received: AudioBuffer, expected: AudioBuffer) {
    if (!this.equals(received, expected)) {
      return {
        pass: false,
        message: () => `Expected ${expected}, got ${received}`,
      };
    }

    for (let i = 0; i < expected.numberOfChannels; ++i) {
      if (
        !bufferEqual(expected.getChannelData(i), received.getChannelData(i))
      ) {
        return {
          pass: false,
          message: () => `Mismatch in channel ${i} data`,
        };
      }
    }

    return {
      pass: true,
      message: () => `Expected ${expected} and ${received} not to match`,
    };
  },
});

WebAudioTestAPI.setState({
  "AudioBuffer#copyToChannel": "enabled",
  "AudioContext#decodeAudioData": "promise",
});

const decodeMap = new Map();
WebAudioTestAPI.createEncodedBuffer = () => {
  const encodedData = Float32Array.from({ length: 4 }, () => Math.random());
  const decodedData = new AudioContext().createBuffer(2, 44100, 44100);

  decodeMap.set(encodedData, decodedData);
  return [encodedData, decodedData];
};

// Workaround for web-audio-test-api not allowing naked constructors, which is
// totally fine

const OriginalAudioContext = AudioContext;
const OriginalAudioBuffer = AudioBuffer;

global.AudioBuffer = function (options: Required<AudioBufferOptions>) {
  return new AudioContext().createBuffer(
    options.numberOfChannels,
    options.length,
    options.sampleRate
  );
} as any;
global.AudioBuffer.prototype = OriginalAudioBuffer.prototype;

global.GainNode = function (context: BaseAudioContext) {
  return context.createGain();
} as any;

global.MediaStreamAudioDestinationNode = function (context: AudioContext) {
  return context.createMediaStreamDestination();
} as any;

(global as any).AudioContext = function (
  ...args: ConstructorParameters<typeof AudioContext>
) {
  const ret = new OriginalAudioContext(...args);
  ret.decodeAudioData = jest.fn((arrayBuffer) => {
    for (const [encoded, decoded] of decodeMap.entries()) {
      if (bufferEqual(encoded, arrayBuffer)) {
        return Promise.resolve(decoded);
      }
    }
    return Promise.reject(new Error("Cannot decode audiobuffer"));
  });
  return ret;
};

const OriginalBlob = Blob;
(global as any).Blob = function (
  blobParts: BlobPart[],
  options?: BlobPropertyBag
) {
  const ret = new OriginalBlob(blobParts, options) as Blob & {
    _buf: ArrayBuffer;
  };
  if (blobParts && blobParts[0] instanceof Float32Array) {
    ret._buf = Uint8Array.from(
      Buffer.concat(
        (blobParts as Float32Array[]).map((a) => Buffer.from(a.buffer))
      )
    ).buffer;
  }
  return ret;
};
Blob.prototype = OriginalBlob.prototype;

Blob.prototype.arrayBuffer = function () {
  return Promise.resolve((this as any)._buf);
};

export {};
