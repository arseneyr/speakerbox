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
import { store, getPersistor, remoteStore } from "./redux";
import AppBar from "./components/AppBar";
import AppBarContainer from "./containers/AppBar";
import { PersistGate } from "redux-persist/integration/react";

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

const Remote = ({ id }: RemoteProps) => {
  const classes = useStyles();
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  useEffect(() => {}, [id]);
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

export default () => {
  const [remoteCode] = useState(() =>
    new URLSearchParams(window.location.search).get("r")
  );

  return (
    <Provider store={remoteCode ? remoteStore : store}>
      {remoteCode ? <Remote id={remoteCode} /> : <Main />}
    </Provider>
  );
};
