import { MiddlewareAPI } from "redux";
import { sourceSelectors, updateSource, workerPool } from "./sources";
import localForage from "localforage";
import FileType from "file-type/browser";
import { AudioContext } from "standardized-audio-context";
import { createWorkerPool } from "./worker_pool";

type RequestIdleCallbackHandle = any;
type RequestIdleCallbackOptions = {
  timeout: number;
};
type RequestIdleCallbackDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};
declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions
    ) => RequestIdleCallbackHandle;
    cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
  }
}

let queued = false;
const audioContext = new AudioContext();

export function scheduleScan({ dispatch, getState }: MiddlewareAPI) {
  if (queued) {
    return;
  }

  queued = true;
  window.requestIdleCallback(() => {
    queued = false;
    sourceSelectors.selectAll(getState()).map(async (source) => {
      if (source.mimeType !== "audio/ogg" && !source.transcoding) {
        dispatch(
          updateSource({ id: source.id, changes: { transcoding: true } })
        );
        console.log(`start load ${source.title}`);
        const buffer = await localForage.getItem<ArrayBuffer>(source.id);
        if (!buffer) {
          return;
        }
        console.log(`start decode ${source.title}`);
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        console.log(`start encode ${source.title}`, audioBuffer);
        await workerPool.encode(source.id, {
          sampleRate: audioBuffer.sampleRate,
          channelBuffers: Array.from(
            { length: audioBuffer.numberOfChannels },
            (_, i) => audioBuffer.getChannelData(i)
          ),
        });
        console.log(`finish encode ${source.title}`);
        if (sourceSelectors.selectById(getState(), source.id) === undefined) {
          await localForage.removeItem(source.id);
        } else {
          dispatch(
            updateSource({
              id: source.id,
              changes: {
                mimeType: "audio/ogg",
                transcoding: false,
              },
            })
          );
        }
      }
    });
  });
}
