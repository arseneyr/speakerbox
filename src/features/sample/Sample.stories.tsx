import { ComponentProps, useState } from "react";
import { Sample } from "./Sample";
import { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

const SampleWrapper = (props: ComponentProps<typeof Sample>) => {
  const [endPlay, setEndPlay] = useState<number | undefined>();
  return (
    <Sample
      {...props}
      onClick={() => {
        setEndPlay(Date.now() + 5000);
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
} satisfies Meta<typeof Sample>;

export default meta;

export const Primary = {
  args: {
    title: "Yo",
    onClick: fn(),
  },
} satisfies StoryObj<typeof meta>;
