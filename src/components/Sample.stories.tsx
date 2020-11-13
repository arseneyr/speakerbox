import React, { ComponentProps, useEffect, useState } from "react";
import { Meta, Story } from "@storybook/react";

import Sample from "./Sample";
import { Grid } from "./Grid";

export default {
  title: "Sample",
  component: Sample,
  decorators: [(Story) => <Grid>{Story()}</Grid>],
  argTypes: {
    durationMs: {
      control: {
        type: "number",
        step: 1000,
      },
    },
  },
} as Meta;

const Template: Story<ComponentProps<typeof Sample>> = (args) => {
  const [playbackStart, setPlaybackStart] = useState<number | undefined>(
    undefined
  );
  useEffect(() => {
    if (args.durationMs) {
      setPlaybackStart(Date.now());
    } else {
      setPlaybackStart(undefined);
    }
  }, [args.durationMs]);
  return (
    <Sample
      {...args}
      onMouseDown={() => setPlaybackStart(Date.now())}
      playbackStart={playbackStart}
    />
  );
};

export const Primary = Template.bind({});
Primary.args = { title: "A totally normal title", durationMs: 2000 };

export const Overflowing = Template.bind({});
Overflowing.args = {
  ...Primary.args,
  title: "This is a very cool sample with an incredibly long name oh yes",
};

export const Loading = Template.bind({});
Loading.args = {
  title: "Smol",
  loading: true,
};
