import { Meta, Template, Story } from "@storybook/addon-svelte-csf";
import SampleButtonWrapper from "./SampleButtonWrapper.svelte";
import Grid from "../components/Grid.svelte";
import { faker } from "@faker-js/faker";
import sample from "./assets/short.webm";

export default {
  component: Grid,
  name: "Grid",
};

export const Default = ({ ...args }) => ({
  Component: Grid,
  props: args,
});
