import React from "react";
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
import { useSelector } from "react-redux";
import { sampleSelectors } from "./redux/samples";
import { RootState } from "./redux";
import AppBar from "./components/AppBar";

const theme = createMuiTheme({ palette: { type: "dark" } });

const useStyles = makeStyles({
  root: { padding: "12px 8px" },
});

export default () => {
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  const editId = useSelector((state: RootState) => state.samples.editing);
  const classes = useStyles();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar />
      <div className={classes.root}>
        <Grid>
          {samples
            .map((id) => <Sample key={id} id={id} />)
            .concat(<AddNew key="AddNew" />)}
        </Grid>
      </div>
      {editId && <Editor id={editId} />}
    </ThemeProvider>
  );
};
