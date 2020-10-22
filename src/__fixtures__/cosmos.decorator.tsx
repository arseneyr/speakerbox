import React from "react";
import "../index.css";
import {
  createMuiTheme,
  ThemeProvider,
  CssBaseline,
  Grid,
} from "@material-ui/core";

const theme = createMuiTheme({ palette: { type: "dark" } });

export default ({ children }: React.PropsWithChildren<{}>) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);
