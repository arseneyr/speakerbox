import {
  selectAudioSourceById,
  playAudioSource,
} from "../audioSource/audioSourceSlice";
import { Sample } from "./Sample";
import { selectIsSampleLoading, selectSampleById } from "./sampleSlice";
import { useAppDispatch, useAppSelector } from "@app/hooks";

interface SampleContainerProps {
  id: string;
}

const SampleContainer = (props: SampleContainerProps) => {
  const sample = useAppSelector((state) => selectSampleById(state, props.id));
  const source = useAppSelector((state) =>
    selectAudioSourceById(state, sample.sourceId),
  );
  const loading = useAppSelector((state) =>
    selectIsSampleLoading(state, props.id),
  );
  const dispatch = useAppDispatch();

  return (
    <Sample
      title={sample.title}
      onClick={() => dispatch(playAudioSource(source.id))}
      loading={loading}
    />
  );
};

export { SampleContainer };
