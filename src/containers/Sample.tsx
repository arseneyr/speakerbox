import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../redux";
import { sampleSelectors } from "../redux/samples";
import Sample from "../components/Sample";
import { audioBufferSelectors, decodeSource } from "../redux/audio_buffer";
import { useRemote, RemoteServer } from "../redux/remote";
import { getSourceUrl, sourceSelectors } from "../redux/sources";
import { createSelector } from "@reduxjs/toolkit";
import { Skeleton } from "@material-ui/lab";

interface Props {
  id: string;
  onEditClick?(id: string): void;
}

export default forwardRef<{ stop: () => void }, Props>(
  ({ id, onEditClick }, ref) => {
    const dispatch: AppDispatch = useDispatch();
    // const waveRef = useRef<Wavesurfer | null>(null);
    const audioRef = useRef<HTMLAudioElement>(new Audio());
    const remote = useRemote() as RemoteServer;
    const [loading, setLoading] = useState(true);
    // const selectorRef = useRef(makeSampleSelector());

    const { title, sourceId, objectUrl, sinkId } = useSelector(
      (state: RootState) => {
        const sample = sampleSelectors.selectById(state, id);
        return {
          title: sample?.title,
          sourceId: sample?.sourceId,
          objectUrl: sample?.sourceId
            ? sourceSelectors.selectById(state, sample?.sourceId)?.objectUrl
            : undefined,
          sinkId: state.settings.sink.sinkId,
        };
      }
    );

    useEffect(() => {
      if (!objectUrl) {
        sourceId && dispatch(getSourceUrl(sourceId));
        return;
      }
      audioRef.current.src = objectUrl;
      audioRef.current.addEventListener("canplaythrough", () =>
        setLoading(false)
      );
      // waveRef.current = Wavesurfer.create({
      //   barWidth: 4,
      //   container: divRef.current,
      //   interact: false,
      //   cursorWidth: 0,
      //   responsive: true,
      //   hideScrollbar: true,
      //   plugins: [RegionsPlugin.create({})],
      // });
      // waveRef.current.setSinkId(sinkId);
      // waveRef.current.loadDecodedBuffer(audioBuffer);
      // return () => {
      //   waveRef.current && waveRef.current.destroy();
      // };
    }, [objectUrl, sourceId, dispatch]);

    useEffect(() => {
      (audioRef.current as any).setSinkId?.(sinkId);
    }, [sinkId]);

    const onPlay = useCallback(() => {
      // if (waveRef.current) {
      //   waveRef.current.seekTo(0);
      //   waveRef.current.play();
      // }
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }, []);

    const onStop = useCallback(() => {
      // if (waveRef.current) {
      //   waveRef.current.stop();
      //   waveRef.current.seekTo(0);
      // }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        stop: onStop,
      }),
      [onStop]
    );

    useEffect(() => {
      remote.addHandler("play", (remoteId) => remoteId === id && onPlay());
      remote.addHandler("stop", (remoteId) => remoteId === id && onStop());
    }, [remote, id, onPlay, onStop]);

    const onEditClickMemo = useCallback(() => {
      onEditClick && onEditClick(id);
      // waveRef.current && waveRef.current.stop();
    }, [id, onEditClick]);

    return loading ? (
      <Skeleton />
    ) : (
      <Sample
        title={title}
        loading={loading}
        onEditClick={onEditClick && onEditClickMemo}
        onPlay={onPlay}
        onStop={onStop}
      />
    );
  }
);
