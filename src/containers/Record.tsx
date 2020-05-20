import React, { useCallback, useState, useRef } from "react";
import { Button, Snackbar } from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { useDispatch } from "react-redux";
import { createSample, setSourceId } from "../redux/samples";
import { v4 } from "uuid";
import { AppDispatch } from "../redux";
import { AudioRecorder } from "../recorder";
import { addAudioBuffer } from "../redux/audio_buffer";
import { saveSource } from "../redux/sources";
import { unwrapResult } from "@reduxjs/toolkit";

const getStream = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  if (!devices.some((d) => Boolean(d.label))) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  }
  const stereoMix = devices.find((d) => /stereo mix/i.test(d.label))?.deviceId;
  return await navigator.mediaDevices.getUserMedia({
    audio: stereoMix ? { deviceId: { exact: stereoMix } } : true,
  });
};

export default () => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<AudioRecorder | null>(null);
  const stopTrack = useRef<(() => void) | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const onEnd = () => {
    recorder.current?.stopRecording();
    recorder.current = null;
    stopTrack.current?.();
    stopTrack.current = null;
    setIsRecording(false);
  };
  const onClick = useCallback(async () => {
    if (isRecording) {
      onEnd();
      return;
    }
    const stream = (await (navigator.mediaDevices as any)?.getDisplayMedia({
      video: true,
      audio: true,
    })) as MediaStream;
    stopTrack.current = () => {
      stream.getTracks().forEach((t) => t.stop());
    };
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setError(`Please select "Share audio"`);
      onEnd();
      return;
    }
    stream.getVideoTracks()[0].addEventListener("ended", onEnd);
    recorder.current = new AudioRecorder();
    recorder.current.startRecording(stream).then((arrayBuffer) => {
      if (arrayBuffer === null) {
        setError("Only silence recorded. Did you mean to play something?");
        return;
      }
      const title =
        "Recording on " + new Date().toLocaleString(navigator.language);
      const {
        payload: { id: sampleId },
      } = dispatch(
        createSample({
          id: v4(),
          title,
        })
      );
      dispatch(saveSource({ buffer: arrayBuffer, title }))
        .then(unwrapResult)
        .then(({ id }) => dispatch(setSourceId({ sampleId, sourceId: id })));
    });
    setIsRecording(true);
  }, [isRecording, dispatch]);
  return (navigator.mediaDevices as any)?.getDisplayMedia ? (
    <>
      <Button onClick={onClick}>
        {isRecording ? "Stop recording" : "Record"}
      </Button>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </>
  ) : null;
};
