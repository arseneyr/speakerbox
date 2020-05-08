import React, { useRef, useEffect, useCallback } from "react";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "../redux";
import { sampleSelectors, decodeSource, startEditing } from "../redux/samples";
import Sample from "../components/Sample";

interface Props {
  id: string;
}

export default ({ id }: Props) => {
  const dispatch: AppDispatch = useDispatch();
  const divRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<Wavesurfer | null>(null);
  const holdToPlayTimerRef = useRef<number | null>(null);
  const holdToPlay = useRef<boolean>(false);
  const touchTimerRef = useRef<number | null>(null);

  const { sample, isEditing, sinkId } = useSelector((state: RootState) => {
    const sample = sampleSelectors.selectById(state, id);
    return {
      sample,
      isEditing: state.samples.editing === id,
      sinkId: state.settings.sink.sinkId,
    };
  });
  const audioBuffer = sample && "audioBuffer" in sample && sample.audioBuffer;
  const sourceId = sample && sample?.sourceId;

  useEffect(() => {
    !audioBuffer &&
      sourceId &&
      dispatch(decodeSource({ sourceId, sampleId: id }));
  }, [id, audioBuffer, sourceId, dispatch]);

  useEffect(() => {
    waveRef.current && waveRef.current.stop();
  }, [isEditing]);

  useEffect(() => {
    if (!divRef.current || !audioBuffer) {
      return;
    }
    waveRef.current = Wavesurfer.create({
      container: divRef.current,
      interact: false,
      cursorWidth: 0,
      responsive: true,
      hideScrollbar: true,
      plugins: [RegionsPlugin.create({})],
    });
    waveRef.current.setSinkId(sinkId);
    waveRef.current.loadDecodedBuffer(audioBuffer);
    return () => {
      waveRef.current && waveRef.current.destroy();
    };
  }, [audioBuffer]);

  useEffect(() => {
    waveRef.current && waveRef.current.setSinkId(sinkId);
  }, [sinkId]);

  const onMouseDown = useCallback(() => {
    if (!waveRef.current) {
      return;
    }
    if (
      waveRef.current &&
      (waveRef.current.backend as any).ac.state === "suspended"
    ) {
      (waveRef.current.backend as any).ac.resume();
    }
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
    }
    waveRef.current.seekTo(0);
    waveRef.current.play();
    holdToPlay.current = false;
    holdToPlayTimerRef.current = window.setTimeout(() => {
      holdToPlayTimerRef.current = null;
      holdToPlay.current = true;
    }, 500);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!waveRef.current) {
      return;
    }
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
      holdToPlayTimerRef.current = null;
    } else if (holdToPlay.current) {
      waveRef.current.stop();
      waveRef.current.seekTo(0);
    }
  }, []);

  const onTouchStart = useCallback(
    (event) => {
      if (!waveRef.current) {
        return;
      }
      if (
        waveRef.current &&
        (waveRef.current.backend as any).ac.state === "suspended"
      ) {
        (waveRef.current.backend as any).ac.resume();
      }

      touchTimerRef.current = window.setTimeout(() => {
        touchTimerRef.current = null;
        onMouseDown();
      }, 50);
    },
    [onMouseDown]
  );

  const onTouchMove = useCallback((evt) => {
    if (!waveRef.current) {
      return;
    }
    evt.preventDefault();
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(
    (evt) => {
      if (!waveRef.current) {
        return;
      }
      evt.preventDefault();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
        if (waveRef.current) {
          waveRef.current.seekTo(0);
          waveRef.current.play();
        }
      } else {
        onMouseUp();
      }
    },
    [onMouseUp]
  );

  const onEditClick = useCallback(() => dispatch(startEditing(id)), [
    dispatch,
    id,
  ]);

  const onDivRef = useCallback((ref) => {
    divRef.current = ref;
  }, []);

  return (
    <Sample
      title={sample?.title}
      loading={!audioBuffer}
      onEditClick={onEditClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onDivRef={onDivRef}
    />
  );
};
