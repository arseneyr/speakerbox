import { Meta, Story } from "@storybook/react";
import React, { ComponentProps, useEffect, useRef } from "react";
import {
  AudioContextProvider,
  useAudioContext,
} from "../containers/AudioContextProvider";
import AudioVisualizer from "./AudioVisualizer";
import audioUrl from "../oh_yes.mp3";
import { Button } from "@material-ui/core";

const MusicPlayer: React.FunctionComponent = ({ children }) => {
  const { context: audioContext, analyzer } = useAudioContext();
  const audioRef = useRef(new Audio());
  useEffect(() => {
    audioRef.current.src = audioUrl;
    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(analyzer);
  }, [audioContext, analyzer]);
  return (
    <>
      <Button
        onClick={() => {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }}
      >
        play
      </Button>
      {children}
    </>
  );
};

export default {
  title: "AudioVisualizer",
  component: AudioVisualizer,
  decorators: [
    (Story) => {
      return (
        <AudioContextProvider>
          <MusicPlayer>{Story()}</MusicPlayer>
        </AudioContextProvider>
      );
    },
  ],
} as Meta;

const Template: Story<ComponentProps<typeof AudioVisualizer>> = (props) => (
  <AudioVisualizer {...props} style={{ width: 190, height: 50 }} />
);

export const Default = Template.bind({});
