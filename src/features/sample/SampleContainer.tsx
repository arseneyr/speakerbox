import { useState } from "react";
import { Sample } from "./Sample";
import {
  playSample,
  selectIsSampleLoading,
  selectSampleById,
  selectSampleDurationMs,
} from "./sampleSlice";
import { useAppDispatch, useAppSelector } from "@app/hooks";

interface SampleContainerProps {
  id: string;
}

const SampleContainer = (props: SampleContainerProps) => {
  const sample = useAppSelector((state) => selectSampleById(state, props.id));
  const loading = useAppSelector((state) =>
    selectIsSampleLoading(state, props.id),
  );
  const durationMs = useAppSelector((state) =>
    selectSampleDurationMs(state, props.id),
  );
  const dispatch = useAppDispatch();
  const [endTime, setEndTime] = useState<number | undefined>();

  return (
    <Sample
      title={sample.title}
      onClick={() => {
        dispatch(playSample(props.id));
        setEndTime(Date.now() + durationMs!);
      }}
      loading={loading}
      progressFinishTime={endTime}
    />
  );
};

export { SampleContainer };
