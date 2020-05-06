import React, { useCallback, ChangeEvent } from "react";
import {
  createStyles,
  WithStyles,
  withStyles,
  Button,
} from "@material-ui/core";
import Add from "@material-ui/icons/Add";
import { AppDispatch } from "./redux";
import { useDispatch } from "react-redux";
import { createSample, setSourceId } from "./redux/samples";
import { v4 } from "uuid";
import { loadFile } from "./redux/sources";
import { unwrapResult } from "@reduxjs/toolkit";

const style = createStyles({
  root: {
    width: "100%",
    height: 184,
    //backgroundColor: "white",
    display: "flex",
  },
  rootLabel: {
    display: "flex",
    height: "100%",
    width: "100%",
  },
  icon: {
    width: "50%",
    height: "50%",
    //color: "rgba(0,0,0,0.4)"
  },
});

export default withStyles(style)(({ classes }: WithStyles<typeof style>) => {
  const dispatch: AppDispatch = useDispatch();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.target &&
        event.target.files &&
        Array.from(event.target.files).forEach(async (f) => {
          const {
            payload: { id: sampleId },
          } = dispatch(createSample({ id: v4(), title: f.name }));
          const { id: sourceId } = unwrapResult(await dispatch(loadFile(f)));
          dispatch(setSourceId({ sampleId, sourceId }));
        });
      event.target.value = "";
    },
    [dispatch]
  );
  return (
    <Button
      className={classes.root}
      variant="contained"
      component="label"
      classes={{ label: classes.rootLabel }}
    >
      <input
        type="file"
        multiple
        accept="audio/*, video/*"
        style={{ display: "none" }}
        onChange={onChange}
      />
      <Add className={classes.icon} />
    </Button>
  );
});
