import React, { useCallback, ChangeEvent } from "react";
import {
  createStyles,
  WithStyles,
  withStyles,
  Button,
} from "@material-ui/core";
import Add from "@material-ui/icons/Add";
import { loadFromFile } from "./redux";
import { useDispatch } from "react-redux";

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
  const dispatch = useDispatch();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.target &&
        event.target.files &&
        dispatch(loadFromFile(event.target.files));
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
        accept="audio/*"
        style={{ display: "none" }}
        onChange={onChange}
      />
      <Add className={classes.icon} />
    </Button>
  );
});
