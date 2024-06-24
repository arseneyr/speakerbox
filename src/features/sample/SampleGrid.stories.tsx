import SampleGrid from "./SampleGrid";
import {
  Default as SampleDefault,
  default as SampleMeta,
} from "./Sample.stories";
import { Meta, StoryObj } from "@storybook/react";
import { ComponentProps } from "react";
import { fn } from "@storybook/test";

type SampleGridArgs = {
  samples: (typeof SampleDefault.args)[];
} & ComponentProps<typeof SampleGrid>;

const SampleWrapper = SampleMeta.component;

const meta = {
  component: SampleGrid,
  render: ({ samples }) => (
    <SampleGrid>
      {samples.map((s) => (
        <SampleWrapper {...s} />
      ))}
    </SampleGrid>
  ),
} satisfies Meta<SampleGridArgs>;

export default meta;

export const Default = {
  args: { samples: Array(100).fill(SampleDefault.args) },
} satisfies StoryObj<typeof meta>;

export const SingleItem = {
  args: {
    samples: [
      {
        title: "Yo",
        onClick: fn(),
        duration: 5000,
      },
    ],
  },
} satisfies StoryObj<typeof meta>;
