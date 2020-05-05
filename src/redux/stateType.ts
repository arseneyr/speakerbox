interface StoredSample {
  title: string;
  start: number;
  end: number;
  arrayBufferHandle: string;
}

interface WorkingSampleData {
  audioBuffer?: AudioBuffer;
  error?: string;
}

type LoadingSample =
  | {
      title: string;
      error?: string;
    }
  | {
      title: string;
      hash: string;
      arrayBuffer: ArrayBuffer;
    };

export interface State {
  savedBuffers: {
    [handle: string]: ArrayBuffer | undefined;
  };

  sampleList: string[];

  storedSamples: {
    [id: string]: StoredSample | undefined;
  };

  workingSampleData: {
    [id: string]: WorkingSampleData | undefined;
  };

  loadingSamples: {
    [id: string]: LoadingSample | undefined;
  };

  editingSample?: {
    id: string;
  };
}
