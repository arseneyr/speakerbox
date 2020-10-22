import Sample from "../components/Sample";
import React, { useState, useEffect, useCallback } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import mp3Url from "!!file-loader!./test.mp3";

export const Wrapper = (
  props: Omit<React.ComponentProps<typeof Sample>, "onPlay" | "onStop">
) => {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(mp3Url);
    a.addEventListener("canplaythrough", () => setAudio(a));
  }, []);
  /*
  const stop = useCallback(() => {
    audio?.pause();
    audio && (audio.currentTime = 0);
  }, [audio]);
  const play = useCallback(() => {
    stop();
    audio?.play();
  }, [stop, audio]);
  */
  return <Sample onPlay={() => {}} onStop={() => {}} {...props} />;
};

export default (
  <Wrapper
    title="My Cool Sample"
    onEditClick={() => alert("edit!")}
    loading={false}
  />
);
