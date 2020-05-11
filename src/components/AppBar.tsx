import React from "react";
import {
  AppBar,
  Toolbar,
  makeStyles,
  TextField,
  MenuItem,
} from "@material-ui/core";
import Remote from "../containers/Remote";

const useStyles = makeStyles({
  outputSelector: {
    width: 300,
  },
});

interface NormalProps {
  onOpen(): void;
  onChange: React.ChangeEventHandler;
  value: string;
  devices: { [deviceId: string]: string };
  remote?: false;
}

interface RemoteProps {
  remote: true;
}

type Props = NormalProps | RemoteProps;

export default (props: Props) => {
  const classes = useStyles();
  return (
    <AppBar position="sticky">
      <Toolbar>
        {props.remote ? undefined : (
          <>
            <TextField
              select
              variant="outlined"
              className={classes.outputSelector}
              helperText="Output device"
              SelectProps={{
                onOpen: props.onOpen,
              }}
              onChange={props.onChange}
              value={props.value}
            >
              {Object.entries(props.devices).map(([deviceId, label], i) => (
                <MenuItem key={deviceId} value={deviceId}>
                  {label || `Speaker ${i}`}
                </MenuItem>
              ))}
            </TextField>
            <Remote />
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
