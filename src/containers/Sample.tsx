import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../redux";
import { sampleSelectors } from "../redux/samples";
import Sample from "../components/Sample";
import { audioBufferSelectors, decodeSource } from "../redux/audio_buffer";
import { useRemote, RemoteServer } from "../redux/remote";
import { sourceSelectors, getSourceUrl } from "../redux/sources";

interface Props {
  id: string;
  onEditClick?(id: string): void;
}

export default forwardRef<{ stop: () => void }, Props>(
  ({ id, onEditClick }, ref) => {
    const dispatch: AppDispatch = useDispatch();
    const divRef = useRef<HTMLDivElement | null>(null);
    // const waveRef = useRef<Wavesurfer | null>(null);
    const audioRef = useRef<HTMLAudioElement>(new Audio());
    const remote = useRemote() as RemoteServer;

    const { sample, objectUrl, sinkId } = useSelector((state: RootState) => {
      const sample = sampleSelectors.selectById(state, id);
      return {
        sample,
        // audioBuffer:
        //   state.audioBuffers &&
        //   audioBufferSelectors.selectById(state, id)?.audioBuffer,
        objectUrl:
          sample?.sourceId &&
          sourceSelectors.selectById(state, sample.sourceId)?.objectUrl,
        sinkId: state.settings && state.settings.sink.sinkId,
      };
    });
    const sourceId = sample && sample?.sourceId;

    useEffect(() => {
      !objectUrl && sourceId && dispatch(getSourceUrl(sourceId));
      // dispatch(decodeSource({ sourceId, sampleId: id }));
    }, [id, objectUrl, sourceId, dispatch]);

    useEffect(() => {
      if (!divRef.current || !objectUrl) {
        return;
      }
      audioRef.current.src = objectUrl;
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
    }, [objectUrl]);

    useEffect(() => {
      (audioRef.current as any).setSinkId?.(sinkId);
    }, [sinkId]);

    const onPlay = useCallback(() => {
      // if (waveRef.current) {
      //   waveRef.current.seekTo(0);
      //   waveRef.current.play();
      // }
    }, []);

    const onStop = useCallback(() => {
      // if (waveRef.current) {
      //   waveRef.current.stop();
      //   waveRef.current.seekTo(0);
      // }
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

    const onDivRef = useCallback((ref) => {
      divRef.current = ref;
    }, []);

    const onEditClickMemo = useCallback(() => {
      onEditClick && onEditClick(id);
      // waveRef.current && waveRef.current.stop();
    }, [id, onEditClick]);

    return (
      <Sample
        title={sample?.title}
        // loading={!audioBuffer}
        onEditClick={onEditClick && onEditClickMemo}
        onPlay={onPlay}
        onStop={onStop}
        onDivRef={onDivRef}
      />
    );
  }
);
