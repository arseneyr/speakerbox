import { Meta, StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import SpeakerSvg from "@assets/speaker.svg?react";

import AddSampleButton from "./AddSampleButton";

const meta = { component: AddSampleButton } satisfies Meta<
  typeof AddSampleButton
>;

export default meta;

const micIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
    />
  </svg>
);

const importIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
    />
  </svg>
);

const speakerIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
    />
  </svg>
);

const options2 = [
  { text: "Record Mic", icon: SpeakerSvg, onClick: action("on-mic-click") },
  {
    text: "Import File",
    icon: <SpeakerSvg />,
    onClick: action("on-import-click"),
  },
  {
    text: "Record Audio",
    icon: SpeakerSvg,
    onClick: action("on-speaker-click"),
  },
];

const options = [
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
