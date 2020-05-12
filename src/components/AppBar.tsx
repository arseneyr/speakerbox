import React, { FunctionComponent } from "react";
import { AppBar as MuiAppBar, Toolbar, makeStyles } from "@material-ui/core";

const useStyles = makeStyles({
  outputSelector: {
    width: 300,
  },
});

const AppBar: FunctionComponent = ({ children }) => {
  const classes = useStyles();
  return (
    <MuiAppBar position="sticky">
      <Toolbar>{children}</Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
