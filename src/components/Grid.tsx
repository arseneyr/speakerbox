import { Grid as MuiGrid } from "@material-ui/core";
import React, { FunctionComponent } from "react";

export const Grid: FunctionComponent = ({ children }) => (
  <MuiGrid container spacing={1}>
    {children}
  </MuiGrid>
);

export const GridItem: FunctionComponent = ({ children }) => (
  <MuiGrid item xs={6} sm={3} md={2} xl={1}>
    {children}
  </MuiGrid>
);
