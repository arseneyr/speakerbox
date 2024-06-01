import { SampleComponent } from "./SampleComponent";
import { Meta } from "@storybook/react";

export default {
  component: SampleComponent,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SampleComponent>;

export const Primary = {};
