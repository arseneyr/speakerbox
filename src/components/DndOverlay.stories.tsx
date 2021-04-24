import { Meta, Story } from "@storybook/react";
import React, { ComponentProps } from "react";
import DndOverlay from "./DndOverlay";

export default {
  title: "DndOverlay",
  component: DndOverlay,
  parameters: {
    backgrounds: {
      default: "light",
    },
  },
} as Meta;

export const Template: Story<ComponentProps<typeof DndOverlay>> = (args) => (
  <DndOverlay {...args} />
);
