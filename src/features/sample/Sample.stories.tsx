import { useState } from "react";
import { Sample } from "./Sample";
import { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

const SampleWrapper = (props: {
  title: string;
  onClick: () => void;
  duration: number;
}) => {
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
