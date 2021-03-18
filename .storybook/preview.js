import React from "react";
import ThemeProvider from "../src/containers/ThemeProvider";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
};

//https://github.com/storybookjs/storybook/issues/12255
export const decorators = [
  (Story) => <ThemeProvider>{Story()}</ThemeProvider>,
  (Story) => <DndProvider backend={HTML5Backend}>{Story()}</DndProvider>,
];
