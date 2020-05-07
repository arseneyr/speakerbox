import React, { useMemo, useState, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  makeStyles,
  TextField,
  MenuItem,
} from "@material-ui/core";
import { AppDispatch } from "../redux";
import { useDispatch } from "react-redux";
import { setSinkId } from "../redux/settings";

const useStyles = makeStyles({
  outputSelector: {
    width: 300,
  },
});

export default () => {
  const classes = useStyles();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [value, setValue] = useState("");
  const onOpen = useCallback(async () => {
    if (devices.length) {
      return;
    }
    let newDevices = await navigator.mediaDevices.enumerateDevices();
    if (newDevices && newDevices[0] && newDevices[0].label === "") {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      newDevices = await navigator.mediaDevices.enumerateDevices();
    }
    setDevices(newDevices);
  }, [devices]);
  const dispatch: AppDispatch = useDispatch();
  const onChange = useCallback(
    (event) => {
      setValue(event.target.value);
      dispatch(setSinkId(event.target.value));
    },
    [dispatch]
  );
  return (
    <AppBar position="sticky">
      <Toolbar>
        <TextField
          select
          variant="outlined"
          label="Choose an ouput device"
          className={classes.outputSelector}
          defaultValue=""
          SelectProps={{
            onOpen,
          }}
          onChange={onChange}
          value={value}
        >
          {devices
            .filter((d) => d.kind === "audiooutput")
            .map((d, i) => (
              <MenuItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Speaker ${i}`}{" "}
              </MenuItem>
            ))}
        </TextField>
      </Toolbar>
    </AppBar>
  );
};
