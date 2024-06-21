import "./App.css";
import { SampleContainer } from "@features/sample/SampleContainer";
import testMp3Url from "@assets/test.mp3";
import { ReactElement } from "react";
import SampleGrid from "./SampleGrid";
import AddSampleButton from "@features/addSample/AddSampleButton";
import { selectAllSampleIds, createSample } from "@features/sample/sampleSlice";
import { useAppDispatch, useAppSelector } from "./hooks";
import { createAudioSource } from "@features/audioSource/audioSourceSlice";

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
  return (
    <SampleGrid>
      {allSampleIds
        .map((id): ReactElement => <SampleContainer id={id} key={id} />)
        .concat(<AddSampleButton onClick={onAddClick} key="addButton" />)}
    </SampleGrid>
  );
}

export default App;
