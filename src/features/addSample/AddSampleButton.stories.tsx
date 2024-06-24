import { Meta, StoryObj } from "@storybook/react";

import AddSampleButton from "./AddSampleButton";
import { fn } from "@storybook/test";

const meta = { component: AddSampleButton } satisfies Meta<
  typeof AddSampleButton
>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: { onClick: fn() },
};
