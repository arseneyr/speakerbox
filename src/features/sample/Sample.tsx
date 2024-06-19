import {
  selectAudioSourceById,
  playAudioSource,
} from "../audioSource/audioSourceSlice";
import { SampleComponent } from "./SampleComponent";
import { selectIsSampleLoading, selectSampleById } from "./sampleSlice";
import { useAppDispatch, useAppSelector } from "@app/hooks";

interface SampleProps {
  id: string;
}

const Sample = (props: SampleProps) => {
  const sample = useAppSelector((state) => selectSampleById(state, props.id));
  const source = useAppSelector((state) =>
    selectAudioSourceById(state, sample.sourceId),
  );
  const loading = useAppSelector((state) =>
    selectIsSampleLoading(state, props.id),
  );
  const dispatch = useAppDispatch();

  return (
    <SampleComponent
      title={sample.title}
      onClick={() => dispatch(playAudioSource(source.id))}
      loading={loading}
    />
  );
};

export { Sample };
