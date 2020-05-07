import React, { useState, useEffect, useRef, useCallback } from "react";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import { useSelector, useDispatch } from "react-redux";
import {
  cancelEditing,
  finishEditing,
  sampleSelectors,
  FullSample,
  deleteSample,
} from "../redux/samples";
import { RootState } from "../redux";
import Editor from "../components/Editor";

interface Props {
  id: string;
}

export default ({ id }: Props) => {
  const sample = useSelector((state: RootState) =>
    sampleSelectors.selectById(state, id)
  ) as FullSample;
  const audioBuffer = sample.audioBuffer!;
  const title = sample.title;
  const [titleValue, setTitleValue] = useState(title);
  const [divRef, setDivRef] = useState<HTMLDivElement | null>(null);
  const waveRef = useRef<Wavesurfer | null>(null);
  const dispatch = useDispatch();
  const onCancel = useCallback(() => dispatch(cancelEditing()), [dispatch]);
  useEffect(() => {
    if (divRef) {
      waveRef.current = Wavesurfer.create({
        container: divRef,
        interact: false,
        hideScrollbar: true,
        cursorWidth: 0,
        plugins: [RegionsPlugin.create({})],
      });
      waveRef.current.loadDecodedBuffer(audioBuffer);
      const region = waveRef.current.addRegion({
        id: 0,
        end: audioBuffer.duration,
        drag: false,
      });
      let currentStart = region.start,
        currentEnd = region.end,
        hasPlayed = false;
      (window as any).region = region;
      region.on("click", () => {
        hasPlayed = true;
        region.play();
      });
      // Workaround for the addition of a 'click' event sink on the
      // body that eats the event and immediately uninstalls itself.
      // Normally, this is so the playback cursor doesn't move after
      // the region is updated, but for touch events a click event
      // doesn't happen due to preventDefault() being called on the
      // touchstart event. Thus for a touch-based region update, the
      // body click handler remains after the update and thus the
      // region requires two taps to trigger the click handler above.
      region.on("update-end", (e: MouseEvent | TouchEvent) => {
        if (e.type === "touchend") {
          region.element.dispatchEvent(new Event("click"));
        }
        if (region.start !== currentStart) {
          currentStart = Math.max(region.start, 0);
          region.update({ start: currentStart });
          hasPlayed && region.play();
        } else if (region.end !== currentEnd) {
          currentEnd = region.end;
          hasPlayed &&
            region.wavesurfer.play(
              Math.max(region.end - 1, region.start),
              region.end
            );
        }
      });
      return () => {
        if (waveRef.current) {
          waveRef.current.destroy();
          waveRef.current = null;
        }
      };
    }
  }, [divRef, audioBuffer]);
  const onTitleChange = useCallback((title) => setTitleValue(title), []);
  const onSave = useCallback(
    () =>
      waveRef.current &&
      dispatch(
        finishEditing({
          newTitle: titleValue,
          newStart: waveRef.current.regions.list[0].start,
          newEnd: waveRef.current.regions.list[0].end,
        })
      ),
    [titleValue, dispatch]
  );
  const onDelete = useCallback(() => dispatch(deleteSample(id)), [
    dispatch,
    id,
  ]);
  return (
    <Editor
      ref={setDivRef}
      onCancel={onCancel}
      onSave={onSave}
      onDelete={onDelete}
      onTitleChange={onTitleChange}
      title={titleValue}
    />
  );
};
