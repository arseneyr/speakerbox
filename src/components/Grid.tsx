import { Grid as MuiGrid } from "@material-ui/core";
import React, { FunctionComponent } from "react";

export const Grid: FunctionComponent = ({ children }) => (
  <MuiGrid style={{ padding: "12px 8px" }} container spacing={1}>
    {React.Children.map(children, (child) => (
      <MuiGrid item xs={6} sm={6} md={6} lg={3}>
        {child}
      </MuiGrid>
    ))}
  </MuiGrid>
);
