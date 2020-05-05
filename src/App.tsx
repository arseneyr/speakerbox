import React from "react";
import { Grid } from "./Grid";
import { CssBaseline } from "@material-ui/core";
import AddNew from "./AddNew";
import Sample from "./Sample";
import Editor from "./Editor";
import { useSelector } from "react-redux";
import { State } from "./redux/stateType";

export default () => {
  const samples = useSelector((state: State) => state.sampleList);
  const editId = useSelector(
    (state: State) => state.editingSample && state.editingSample.id
  );
  return (
    <>
      <CssBaseline />
      <Grid>
        {samples
          .map(id => <Sample key={id} id={id} />)
          .concat(<AddNew key="AddNew" />)}
      </Grid>
      {editId && <Editor id={editId} />}
    </>
  );
};
