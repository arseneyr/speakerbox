import { Waveform } from "./Waveform";
import { Meta, StoryObj } from "@storybook/react";
import mp3Url from "@assets/test.mp3";

const mediaElement = new Audio(
  URL.createObjectURL(await fetch(mp3Url).then((r) => r.blob())),
);

const meta = {
  component: Waveform,
} satisfies Meta<typeof Waveform>;

export default meta;

export const Primary = {
  args: {
    initialTitle: "Yo",
    id: "test",
    mediaElement,
  },
} satisfies StoryObj<typeof meta>;
