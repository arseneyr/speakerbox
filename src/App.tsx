import React, { useState } from "react";
import { CssBaseline, ThemeProvider, createMuiTheme } from "@material-ui/core";
import Main from "./containers/Main";
import RemoteMain from "./containers/RemoteMain";

const theme = createMuiTheme({ palette: { type: "dark" } });

export default () => {
  const [remoteCode] = useState(() =>
    new URLSearchParams(window.location.search).get("r")
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {remoteCode ? <RemoteMain id={remoteCode} /> : <Main />}
    </ThemeProvider>
  );
};
