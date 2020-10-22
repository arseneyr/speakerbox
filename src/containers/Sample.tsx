import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux";
import { sampleSelectors, FullSample } from "../redux/samples";
import Sample from "../components/Sample";
import localForage from "localforage";
import { useRemote, RemoteServer } from "../redux/remote";
import { sourceSelectors } from "../redux/sources";

interface Props {
  id: string;
  onEditClick?(param: { id: string; mediaElement: HTMLAudioElement }): void;
}

export default forwardRef<{ stop: () => void }, Props>(
  ({ id, onEditClick }, ref) => {
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const endTimer = useRef<number | null>(null);
    const remote = useRemote() as RemoteServer;

    const { sample, sinkId, buffer } = useSelector((state: RootState) => {
      const sample = sampleSelectors.selectById(state, id);
      return {
        sample,
        sinkId: state.settings && state.settings.sink.sinkId,
        buffer:
          sample?.sourceId &&
          sourceSelectors.selectById(state, sample?.sourceId)?.buffer,
      };
    });
    const { start, end } =
      sample && "start" in sample ? sample : { start: 0, end: undefined };

    useEffect(() => {
      if (!buffer) return;
      const a = new Audio(URL.createObjectURL(new Blob([buffer])));
      a.addEventListener("canplaythrough", () => setAudio(a));
    }, [buffer]);

    useEffect(() => {
      if (audio && (audio as any).setSinkId) {
        (audio as any).setSinkId(sinkId);
      }
    }, [audio, sinkId]);

    const stop = useCallback(() => {
      if (audio) {
        audio.pause();
        audio.currentTime = start;
        if (endTimer.current !== null) {
          window.clearTimeout(endTimer.current);
          endTimer.current = null;
        }
      }
    }, [audio, start]);

    const play = useCallback(() => {
      stop();
      if (audio) {
        audio.play();
        if (end) {
          endTimer.current = window.setTimeout(stop, (end - start) * 1000);
        }
      }
    }, [audio, start, end, stop]);

    useImperativeHandle(
      ref,
      () => ({
        stop,
      }),
      [stop]
    );

    useEffect(() => {
      remote.addHandler("play", (remoteId) => remoteId === id && play());
      remote.addHandler("stop", (remoteId) => remoteId === id && stop());
    }, [remote, id, play, stop]);

    const onEditClickMemo = useCallback(() => {
      stop();
      onEditClick && audio && onEditClick({ id, mediaElement: audio });
    }, [id, onEditClick, stop, audio]);

    return (
      <Sample
        title={sample?.title}
        loading={!audio}
        onEditClick={onEditClickMemo}
        onPlay={play}
        onStop={stop}
      />
    );
  }
);
