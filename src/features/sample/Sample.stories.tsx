import { ComponentProps, useState } from "react";
import { Sample } from "./Sample";
import { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

type SampleWrapperProps = ComponentProps<typeof Sample> & { duration: number };

const SampleWrapper = (props: SampleWrapperProps) => {
  const [endPlay, setEndPlay] = useState<number | undefined>();
  return (
    <Sample
      {...props}
      onClick={() => {
        setEndPlay(Date.now() + props.duration);
        props.onClick?.();
      }}
      progressFinishTime={endPlay}
    />
  );
};

const meta = {
  component: SampleWrapper,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SampleWrapper>;

export default meta;

export const Default = {
  args: {
    title: "Yo",
    onClick: fn(),
    duration: 5000,
  },
} satisfies StoryObj<typeof meta>;

export const Loading = {
  args: {
    ...Default.args,
    loading: true,
  },
} satisfies StoryObj<typeof meta>;

export const Errored = {
  args: {
    ...Default.args,
    errored: true,
  },
} satisfies StoryObj<typeof meta>;
