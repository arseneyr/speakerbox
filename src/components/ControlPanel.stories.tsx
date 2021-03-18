import React, { ComponentProps } from "react";
import { Meta, Story } from "@storybook/react";
import ControlPanel, { DroppableButton, UploadButton } from "./ControlPanel";
import { gridDecorator } from "./Grid.stories";
import Edit from "@material-ui/icons/Edit";
import Upload from "@material-ui/icons/Publish";

export default {
  title: "ControlPanel",
  component: ControlPanel,
  decorators: [gridDecorator],
} as Meta;

export const Template: Story<ComponentProps<typeof ControlPanel>> = (args) => (
  <ControlPanel {...args}>
    <DroppableButton icon={Edit} iconLabel="Edit" />
    <UploadButton icon={Upload} iconLabel="Load" />
  </ControlPanel>
);
