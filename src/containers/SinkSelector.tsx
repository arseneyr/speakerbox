import React, { useState, useCallback, useEffect } from "react";
import { AppDispatch, RootState } from "../redux";
import { useDispatch, useSelector } from "react-redux";
import { setSinkId, setPreferredSink } from "../redux/settings";
import { TextField, MenuItem } from "@material-ui/core";

const getDevices = async () =>
  Object.fromEntries(
    (await navigator.mediaDevices.enumerateDevices())
      .filter((d) => d.kind === "audiooutput")
      .map((d) => [d.deviceId, d.label])
  );

export default () => {
  if (!navigator.mediaDevices) {
    return null;
  }

  const dispatch: AppDispatch = useDispatch();
  const [enumeratedDevices, setEnumeratedDevices] = useState<{
    [deviceId: string]: string;
  }>({});
  const { preferredSink, sink } = useSelector((state: RootState) => ({
    preferredSink: state.settings.preferredSink,
    sink: state.settings.sink,
  }));
  const devices = Object.values(enumeratedDevices).length
    ? Object.assign({}, enumeratedDevices)
    : { [sink.sinkId]: sink.sinkName };

  useEffect(() => {
    const f = async () => setEnumeratedDevices(await getDevices());
    navigator.mediaDevices.addEventListener("devicechange", f);
    f();
  }, []);

  useEffect(() => {
    if (
      preferredSink &&
      sink.sinkId !== preferredSink.sinkId &&
      enumeratedDevices[preferredSink.sinkId] !== undefined
    ) {
      dispatch(setSinkId(preferredSink));
    } else if (enumeratedDevices[sink.sinkId] === undefined) {
      dispatch(
        setSinkId({
          sinkId: "default",
          sinkName: enumeratedDevices["default"] || "Default Output",
        })
      );
    }
  }, [dispatch, enumeratedDevices, preferredSink, sink]);

  const onOpen = useCallback(async () => {
    if (Object.values(enumeratedDevices).some(Boolean)) {
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setEnumeratedDevices(await getDevices());
    } catch (e) {}
  }, [enumeratedDevices]);

  const onChange = useCallback(
    (event) =>
      dispatch(
        setPreferredSink({
          sinkId: event.target.value,
          sinkName: enumeratedDevices[event.target.value],
        })
      ),
    [dispatch, enumeratedDevices]
  );

  return (
    <TextField
      select
      variant="outlined"
      style={{ width: 300 }}
      SelectProps={{
        onOpen,
      }}
      onChange={onChange}
      value={sink.sinkId}
    >
      {Object.entries(devices).map(([deviceId, label], i) => (
        <MenuItem key={deviceId} value={deviceId}>
          {label || `Speaker ${i}`}
        </MenuItem>
      ))}
    </TextField>
  );
};
