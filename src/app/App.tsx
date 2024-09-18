import "./App.css";
import { SampleContainer } from "@features/sample/SampleContainer";
import testMp3Url from "@assets/test.mp3";
import { ReactElement } from "react";
import SampleGrid from "@features/sample/SampleGrid";
import AddSampleButton from "@features/addSample/AddSampleButton";
import { selectAllSampleIds, createSample } from "@features/sample/sampleSlice";
import { useAppDispatch, useAppSelector } from "./hooks";
import { createAudioSource } from "@features/audioSource/audioSourceSlice";
import { PersistGate } from "@features/persist/PersistGate";
import PlusSvg from "@assets/plus.svg?react";
import {
  RecorderState,
  selectRecorder,
  startRecording,
} from "@features/recorder/recorderSlice";

async function fetchTestMp3() {
  const resp = await fetch(testMp3Url);
  return await resp.blob();
}

function App() {
  const allSampleIds = useAppSelector(selectAllSampleIds);
  const dispatch = useAppDispatch();
  async function onAddClick() {
    const blob = await fetchTestMp3();
    const sourceId = crypto.randomUUID();
    const sampleId = crypto.randomUUID();
    dispatch(createAudioSource({ id: sourceId, blob }));
    dispatch(createSample({ id: sampleId, sourceId, title: "SUUUP" }));
  }
  const addButtonOptions = [
    { text: "Add sample", icon: <PlusSvg />, onClick: onAddClick },
  ];
  return (
    <PersistGate
      loading={<span className="loading loading-ring loading-lg"></span>}
      debounceMs={2000}
    >
      <SampleGrid>
        {allSampleIds
          .map((id): ReactElement => <SampleContainer id={id} key={id} />)
          .concat(
            <AddSampleButton
              options={addButtonOptions}
              default={null}
              key="addButton"
            />,
          )
          .concat(
            <button className="btn" onClick={() => dispatch(startRecording())}>
              {useAppSelector(selectRecorder) === RecorderState.RECORDING
                ? "recording"
                : "record"}
            </button>,
          )}
      </SampleGrid>
    </PersistGate>
  );
}

export default App;
