import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  DialogContentText,
  DialogTitle,
  TextField,
  DialogActions,
  Button,
  makeStyles,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { PositionProperty } from "csstype";
import { ReactComponent as RotateIcon } from "./rotateIcon.svg";

const handleStyle = {
  content: '""',
  display: "inline-block",
  width: 24,
  height: 48,
  backgroundColor: "#69b6d5",
  position: "absolute" as PositionProperty,
  top: "50%",
};

const useStyles = makeStyles({
  containerDiv: {
    padding: "0 28px",
  },
  waveDiv: {
    "& > wave": {
      overflow: "unset !important",
    },
  },
  dialogTitle: {
    paddingLeft: 28,
    paddingRight: 28,
  },
  dialogActions: {
    margin: "8px 16px",
  },
  rotateDivCloseButton: {
    position: "absolute",
    right: 8,
    top: 8,
  },
  rotateDialogContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  deleteButton: {
    marginRight: "auto",
  },
  "@global": {
    ".wavesurfer-handle": {
      width: "2px !important",
      backgroundColor: "#69b6d5",
    },
    ".wavesurfer-handle-end": {
      left: "unset !important",
      right: 0,
    },
    ".wavesurfer-handle-start::before": {
      ...handleStyle,
      borderBottomLeftRadius: 24,
      borderTopLeftRadius: 24,
      margin: "-24px 0px 0px -23px",
    },
    ".wavesurfer-handle-end::before": {
      ...handleStyle,
      borderBottomRightRadius: 24,
      borderTopRightRadius: 24,
      margin: "-24px -23px 0px 0px",
    },
    region: {
      zIndex: "4 !important" as any,
    },
  },
});

interface Props {
  title: string;
  onTitleChange(newTitle: string): void;
  onSave(): void;
  onCancel(): void;
  onDelete(): void;
}

export default React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { title, onTitleChange, onSave, onCancel, onDelete } = props;
  const classes = useStyles();

  const [showEditor, setShowEditor] = useState(
    window.orientation === undefined || window.orientation !== 0
  );

  useEffect(() => {
    window.onorientationchange = () =>
      setShowEditor(
        window.orientation === undefined || window.orientation !== 0
      );
  }, []);

  const onChange = useCallback((evt) => onTitleChange(evt.target.value), [
    onTitleChange,
  ]);

  return (
    <Dialog
      open
      maxWidth={showEditor ? false : undefined}
      fullWidth={showEditor}
    >
      <div style={showEditor ? undefined : { display: "none" }}>
        <DialogTitle className={classes.dialogTitle}>
          <TextField
            value={title}
            onChange={onChange}
            placeholder="Title"
            fullWidth
          />
        </DialogTitle>
        <div className={classes.containerDiv}>
          <div
            style={{ width: "100%", height: "100%" }}
            ref={ref}
            className={classes.waveDiv}
          />
        </div>
        <DialogActions className={classes.dialogActions}>
          <Button
            onClick={onDelete}
            color="secondary"
            className={classes.deleteButton}
          >
            Delete
          </Button>
          <Button disabled={title === ""} onClick={onSave}>
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </DialogActions>
      </div>
      {!showEditor && (
        <>
          <IconButton
            className={classes.rotateDivCloseButton}
            onClick={onCancel}
          >
            <CloseIcon />
          </IconButton>
          <DialogTitle />
          <DialogContent className={classes.rotateDialogContent}>
            <RotateIcon />
            <DialogContentText>Rotate to edit this sample</DialogContentText>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
});
