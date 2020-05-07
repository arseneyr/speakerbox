import React from "react";
import { Grid } from "./Grid";
import { CssBaseline, ThemeProvider, createMuiTheme } from "@material-ui/core";
import AddNew from "./AddNew";
import Sample from "./containers/Sample";
import Editor from "./containers/Editor";
import { useSelector } from "react-redux";
import { sampleSelectors } from "./redux/samples";
import { RootState } from "./redux";

const theme = createMuiTheme({ palette: { type: "dark" } });

export default () => {
  const samples = useSelector(sampleSelectors.selectIds) as string[];
  const editId = useSelector((state: RootState) => state.samples.editing);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Grid>
        {samples
          .map((id) => <Sample key={id} id={id} />)
          .concat(<AddNew key="AddNew" />)}
      </Grid>
      {editId && <Editor id={editId} />}
    </ThemeProvider>
  );
};
