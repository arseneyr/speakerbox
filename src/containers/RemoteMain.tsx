import React, { useState, useEffect, useCallback } from "react";
import { useSelector, Provider } from "react-redux";
import { sampleSelectors } from "../redux/samples";
import { Grid } from "../components/Grid";
import RemoteSample from "./RemoteSample";
import { RemoteState } from "../redux";
import { Store } from "@reduxjs/toolkit";
import { RemoteClient, RemoteProvider, useRemote } from "../redux/remote";
import AppBar from "../components/AppBar";
import { Button } from "@material-ui/core";

interface RemoteProps {
  id: string;
}

const Remote = () => {
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  const remote = useRemote() as RemoteClient;
  const stopAll = useCallback(() => remote.sendStopAll(), [remote]);
  console.log(samples);
  return (
    <>
      <AppBar>
        <Button onClick={stopAll}>Stop!</Button>
      </AppBar>
      <Grid>
        {samples.map((id) => (
          <RemoteSample key={id} id={id} />
        ))}
      </Grid>
    </>
  );
};

export default ({ id }: RemoteProps) => {
  const [state, setState] = useState<{
    store: Store<RemoteState>;
    client: RemoteClient;
  } | null>(null);

  useEffect(() => {
    const client = new RemoteClient(id);
    client.store.then((store) => setState({ store, client }));
    client.connect();
    return () => {
      client.destroy();
      setState(null);
    };
  }, [id]);

  return state ? (
    <Provider store={state.store}>
      <RemoteProvider value={state.client}>
        <Remote />
      </RemoteProvider>
    </Provider>
  ) : (
    <div>Loading</div>
  );
};
