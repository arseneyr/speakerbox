import React from "react";
import { Grid } from "../components/Grid";
import { Wrapper } from "./Sample.fixture";
import { lorem, random } from "faker";

export default (
  <Grid>
    {Array.from({ length: 15 }, () => (
      <Wrapper title={lorem.words(5)} duration={random.number(4, 10)} />
    ))}
  </Grid>
);
