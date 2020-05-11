import React, { useState, useEffect, useCallback } from "react";
import { Grid } from "./components/Grid";
import {
  CssBaseline,
  ThemeProvider,
  createMuiTheme,
  makeStyles,
} from "@material-ui/core";
import AddNew from "./components/AddNew";
import Sample from "./containers/Sample";
import Editor from "./containers/Editor";
import { useSelector, Provider } from "react-redux";
import { sampleSelectors } from "./redux/samples";
import { store, getPersistor, remoteStore, RemoteState } from "./redux";
import AppBar from "./components/AppBar";
import AppBarContainer from "./containers/AppBar";
import { PersistGate } from "redux-persist/integration/react";
import { Store } from "@reduxjs/toolkit";
import { RemoteClient } from "./redux/remote";

const theme = createMuiTheme({ palette: { type: "dark" } });

const useStyles = makeStyles({
  root: { padding: "12px 8px" },
});

const Main = () => {
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  const [editId, setEditId] = useState<string | null>(null);
  const onEditorClose = useCallback(() => setEditId(null), []);
  const classes = useStyles();
  return (
    <PersistGate persistor={getPersistor()}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBarContainer />
        <div className={classes.root}>
          <Grid>
            {samples
              .map((id) => <Sample key={id} id={id} onEditClick={setEditId} />)
              .concat(<AddNew key="AddNew" />)}
          </Grid>
        </div>
        {editId && <Editor onClose={onEditorClose} id={editId} />}
      </ThemeProvider>
    </PersistGate>
  );
};

interface RemoteProps {
  id: string;
}

const Remote = () => {
  const classes = useStyles();
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  console.log(samples);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar remote />
      <div className={classes.root}>
        <Grid>
          {samples.map((id) => (
            <Sample key={id} id={id} />
          ))}
        </Grid>
      </div>
    </ThemeProvider>
  );
};

const RemoteStoreGate = ({ id }: RemoteProps) => {
  const [store, setStore] = useState<Store<RemoteState> | null>(null);

  useEffect(() => {
    const client = new RemoteClient(id);
    client.store.then(setStore);
    return () => {
      client.destroy();
    };
  }, [id]);

  return store ? (
    <Provider store={store}>
      <Remote />
    </Provider>
  ) : (
    <div>Loading</div>
  );
};

export default () => {
  const [remoteCode] = useState(() =>
    new URLSearchParams(window.location.search).get("r")
  );

  return remoteCode ? (
    <RemoteStoreGate id={remoteCode} />
  ) : (
    <Provider store={store}>
      <Main />
    </Provider>
  );
};
