import React from "react";
import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createMuiTheme,
} from "@material-ui/core";
import MerriweatherSans from "../MerriweatherSans-ExtraBoldItalic.ttf";

const merriweatherSans = {
  fontFamily: "Merriweather Sans",
  fontWeight: 800,
  fontStyle: "italic",
  src: `
    local(Merriweather Sans),
    url(${MerriweatherSans}) format('truetype')

  `,
};

const theme = createMuiTheme({
  palette: { type: "dark" },
  overrides: {
    MuiCssBaseline: {
      "@global": {
        "@font-face": [merriweatherSans],
      },
    },
  },
});

const ThemeProvider: React.FunctionComponent = ({ children }) => {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
