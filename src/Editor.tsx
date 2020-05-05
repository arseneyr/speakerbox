import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  createStyles,
  WithStyles,
  withStyles,
  IconButton,
  DialogContentText,
  DialogTitle,
  TextField,
  DialogActions,
  Button,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import { PositionProperty } from "csstype";
import { ReactComponent as RotateIcon } from "./rotateIcon.svg";
import { useSelector, useDispatch } from "react-redux";
import { State } from "./redux/stateType";
import { editDone, editCancel } from "./redux";

const handleStyle = {
  content: '""',
  display: "inline-block",
  width: 24,
  height: 48,
  backgroundColor: "#69b6d5",
  position: "absolute" as PositionProperty,
  top: "50%",
};

const style = createStyles({
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

interface Props extends WithStyles<typeof style> {
  id: string;
}

export default withStyles(style)(({ id, classes }: Props) => {
  const [showEditor, setShowEditor] = useState(
    window.orientation === undefined || window.orientation !== 0
  );
  const { title, buffer } = useSelector((state: State) => ({
    title: state.storedSamples[id]!.title,
    buffer: state.workingSampleData[id]!.audioBuffer!,
  }));
  const [titleValue, setTitleValue] = useState(title);
  const [divRef, setDivRef] = useState<HTMLDivElement | null>(null);
  const waveRef = useRef<Wavesurfer | null>(null);
  const dispatch = useDispatch();
  const onCancel = useCallback(() => dispatch(editCancel()), [dispatch]);
  useEffect(() => {
    window.onorientationchange = () =>
      setShowEditor(
        window.orientation === undefined || window.orientation !== 0
      );
  }, []);
  useEffect(() => {
    if (divRef) {
      waveRef.current = Wavesurfer.create({
        container: divRef,
        interact: false,
        hideScrollbar: true,
        cursorWidth: 0,
        plugins: [RegionsPlugin.create({})],
      });
      waveRef.current.loadDecodedBuffer(buffer);
      const region = waveRef.current.addRegion({
        id: 0,
        end: buffer.duration,
        drag: false,
      });
      region.on("click", () => {
        if (region.start < 0) {
          region.update({ start: 0 });
        }
        region.play();
      });
      // Workaround for the addition of a 'click' event sink on the
      // body that eats the event and immediately uninstalls itself.
      // Normally, this is so the playback cursor doesn't move after
      // the region is updated, but for touch events a click event
      // doesn't happen due to preventDefault() being called on the
      // touchstart event. Thus for a touch-based region update, the
      // body click handler remains after the update and thus the
      // region requires two taps to trigger the click handler above.
      region.on("update-end", (e: MouseEvent | TouchEvent) => {
        if (e.type === "touchend") {
          region.element.dispatchEvent(new Event("click"));
        }
      });
      return () => {
        if (waveRef.current) {
          waveRef.current.destroy();
          waveRef.current = null;
        }
      };
    }
  }, [divRef, buffer]);
  const onTitleChange = useCallback(
    (event) => setTitleValue(event.target.value),
    []
  );
  const onSaveClick = useCallback(
    () =>
      waveRef.current &&
      dispatch(
        editDone({
          newTitle: titleValue,
          newStart: waveRef.current.regions.list[0].start,
          newEnd: waveRef.current.regions.list[0].end,
        })
      ),
    [titleValue, dispatch]
  );
  return (
    <Dialog
      open
      maxWidth={showEditor ? false : undefined}
      fullWidth={showEditor}
    >
      {(showEditor || divRef) && (
        <div style={showEditor ? undefined : { display: "none" }}>
          <DialogTitle className={classes.dialogTitle}>
            <TextField
              value={titleValue}
              onChange={onTitleChange}
              placeholder="Title"
              fullWidth
            />
          </DialogTitle>
          <div className={classes.containerDiv}>
            <div
              style={{ width: "100%", height: "100%" }}
              ref={setDivRef}
              className={classes.waveDiv}
            />
          </div>
          <DialogActions className={classes.dialogActions}>
            <Button disabled={titleValue === ""} onClick={onSaveClick}>
              Save
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </DialogActions>
        </div>
      )}
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
