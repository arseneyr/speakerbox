import { useSelector, Provider } from "react-redux";
import { sampleSelectors } from "../redux/samples";
import React, { useState, useCallback, createRef, useEffect } from "react";
import { RemoteServer, RemoteProvider, useRemote } from "../redux/remote";
import { store, persistor } from "../redux";
import { PersistGate } from "redux-persist/integration/react";
import { Grid } from "../components/Grid";
import AddNew from "../components/AddNew";
import Sample from "./Sample";
import Editor from "./Editor";
import AppBar from "../components/AppBar";
import SinkSelector from "./SinkSelector";
import { Button } from "@material-ui/core";
import RemoteButton from "./RemoteButton";
import Record from "./Record";

const Main = () => {
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  const [editId, setEditId] = useState<string | null>(null);
  const onEditorClose = useCallback(() => setEditId(null), []);
  const remote = useRemote() as RemoteServer;

  const [refs, setRefs] = useState<{
    [id: string]: React.RefObject<{ stop: () => void }>;
  }>(() => Object.fromEntries(samples.map((id) => [id, createRef()])));

  useEffect(() => {
    setRefs((refs) =>
      Object.fromEntries(
        samples.reduce((a, c) => {
          a.push([c, refs[c] ?? createRef()]);
          return a;
        }, [] as [string, React.RefObject<{ stop: () => void }>][])
      )
    );
  }, [samples]);

  const stopAll = useCallback(() => {
    Object.values(refs).forEach((r) => r.current?.stop());
  }, [refs]);

  useEffect(() => remote.addHandler("stopAll", stopAll), [stopAll, remote]);

  return (
    <>
      <AppBar>
        <SinkSelector />
        <Button onClick={stopAll}>Stop!</Button>
        <RemoteButton />
      </AppBar>
      <Grid>
        {samples
          .map((id) => (
            <Sample key={id} id={id} ref={refs[id]} onEditClick={setEditId} />
          ))
          .concat(<AddNew key="AddNew" />, <Record />)}
      </Grid>
      {editId && <Editor onClose={onEditorClose} id={editId} />}
    </>
  );
};

export default () => {
  const [remote] = useState<RemoteServer>(() => new RemoteServer(store));
  return (
    <Provider store={store}>
      <RemoteProvider value={remote}>
        <PersistGate persistor={persistor}>
          <Main />
        </PersistGate>
      </RemoteProvider>
    </Provider>
  );
};
