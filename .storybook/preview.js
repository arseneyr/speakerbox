import React from "react";
import ThemeProvider from "../src/containers/ThemeProvider";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

//https://github.com/storybookjs/storybook/issues/12255
export const decorators = [(Story) => <ThemeProvider>{Story()}</ThemeProvider>];
