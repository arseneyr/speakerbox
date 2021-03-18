/* eslint-disable import/no-anonymous-default-export */
import React, { ComponentProps } from "react";
import { DecoratorFn, Meta, Story } from "@storybook/react";
import { Grid } from "./Grid";
import Sample from "./Sample";
import { Primary } from "./Sample.stories";
import faker from "faker";

export const gridDecorator: DecoratorFn = (Story) => <Grid>{Story()}</Grid>;

export default {
  title: "Grid",
  component: Grid,
  includeStories: ["Many"],
} as Meta;

const GridTemplate: Story<
  ComponentProps<typeof Grid> & { items: ComponentProps<typeof Sample>[] }
> = ({ items, ...args }) => (
  <Grid>
    {items.map((item) => (
      <Primary {...item} />
    ))}
  </Grid>
);

export const Many = GridTemplate.bind({});
Many.args = {
  items: Array.from({ length: 200 }, () => ({
    durationMs: faker.random.number({ min: 1, max: 10 }) * 1000,
    title: faker.random.words(faker.random.number({ min: 3, max: 5 })),
    loading: faker.random.boolean(),
  })),
};
