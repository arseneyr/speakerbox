import { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import SpeakerSvg from "@assets/speaker.svg?react";
import MicrophoneSvg from "@assets/microphone.svg?react";
import ImportSvg from "@assets/import.svg?react";

import AddSampleButton from "./AddSampleButton";

const meta = { component: AddSampleButton } satisfies Meta<
  typeof AddSampleButton
>;

export default meta;

const options = [
  {
    text: "Record Mic",
    icon: <MicrophoneSvg />,
    onClick: action("on-mic-click"),
  },
  {
    text: "Import File",
    icon: <ImportSvg />,
    onClick: action("on-import-click"),
  },
  {
    text: "Record Audio",
    icon: <SpeakerSvg />,
    onClick: action("on-speaker-click"),
  },
];

export const NoDefault: StoryObj<typeof meta> = {
  args: {
    options,
    default: null,
  },
};

export const WithDefault: StoryObj<typeof meta> = {
  args: {
    options,
    default: options[options.length - 1],
  },
};
