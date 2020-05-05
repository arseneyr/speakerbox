import React, { useRef, useEffect, useCallback, useState } from "react";
import Wavesurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions";
import {
  Card,
  CardActionArea,
  CardHeader,
  IconButton,
  createStyles,
  withStyles,
  WithStyles,
  CircularProgress,
} from "@material-ui/core";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import SampleMenu from "./SampleMenu";
import { useSelector, useDispatch } from "react-redux";
import { State } from "./redux/stateType";
import { decodeAudio } from "./redux";

const styles = createStyles({
  card: {
    position: "relative",
  },
  cardActionArea: {
    userSelect: "none",
    touchAction: "manipulation",
    "-webkitTouchCallout": "none",
  },
  cardDisableHover: {
    opacity: [["0"], "!important"] as any,
  },
  headerAction: {
    margin: "0px 4px",
  },
  headerTitle: {
    padding: "0px 12px",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  headerTitleContainer: {
    minWidth: 0,
  },
  loadingDiv: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});

interface Props extends WithStyles<typeof styles> {
  id: string;
}

export default withStyles(styles)(({ id, classes }: Props) => {
  const dispatch = useDispatch();
  const divRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<Wavesurfer | null>(null);
  const holdToPlayTimerRef = useRef<number | null>(null);
  const holdToPlay = useRef<boolean>(false);
  const touchTimerRef = useRef<number | null>(null);
  const [cornerIconEntered, setCornerIconEntered] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { title, buffer, isEditing } = useSelector(
    (state: State) => {
      const sample = state.loadingSamples[id] || state.storedSamples[id];
      const workingSampleData = state.workingSampleData[id];
      return {
        title: sample!.title,
        buffer: workingSampleData
          ? workingSampleData.audioBuffer || null
          : null,
        isEditing: Boolean(state.editingSample),
        storedSample: state.storedSamples[id],
      };
    }
    /*(a, b) =>
      a.title === b.title &&
      a.isEditing === b.isEditing &&
      Boolean(a.buffer) === Boolean(b.buffer) &&
      shallowEqual(a.storedSample, b.storedSample)*/
  );

  useEffect(() => {
    dispatch(decodeAudio(id));
  }, [id, dispatch]);

  useEffect(() => {
    waveRef.current && waveRef.current.stop();
  }, [isEditing]);

  useEffect(() => {
    if (!divRef.current || !buffer) {
      return;
    }
    waveRef.current = Wavesurfer.create({
      container: divRef.current,
      interact: false,
      cursorWidth: 0,
      responsive: true,
      hideScrollbar: true,
      plugins: [RegionsPlugin.create({})],
    });
    waveRef.current.loadDecodedBuffer(buffer);
    return () => {
      waveRef.current && waveRef.current.destroy();
    };
  }, [buffer]);

  const onMouseDown = useCallback(() => {
    if (!waveRef.current) {
      return;
    }
    if (
      waveRef.current &&
      (waveRef.current.backend as any).ac.state === "suspended"
    ) {
      (waveRef.current.backend as any).ac.resume();
    }
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
    }
    waveRef.current.seekTo(0);
    waveRef.current.play();
    holdToPlay.current = false;
    holdToPlayTimerRef.current = window.setTimeout(() => {
      holdToPlayTimerRef.current = null;
      holdToPlay.current = true;
    }, 500);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!waveRef.current) {
      return;
    }
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
      holdToPlayTimerRef.current = null;
    } else if (holdToPlay.current) {
      waveRef.current.stop();
      waveRef.current.seekTo(0);
    }
  }, []);

  const onTouchStart = useCallback(
    (event) => {
      if (!waveRef.current) {
        return;
      }
      if (
        waveRef.current &&
        (waveRef.current.backend as any).ac.state === "suspended"
      ) {
        (waveRef.current.backend as any).ac.resume();
      }

      touchTimerRef.current = window.setTimeout(() => {
        touchTimerRef.current = null;
        onMouseDown();
      }, 50);
    },
    [onMouseDown]
  );

  const onTouchMove = useCallback((evt) => {
    if (!waveRef.current) {
      return;
    }
    evt.preventDefault();
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(
    (evt) => {
      if (!waveRef.current) {
        return;
      }
      evt.preventDefault();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
        if (waveRef.current) {
          waveRef.current.seekTo(0);
          waveRef.current.play();
        }
      } else {
        onMouseUp();
      }
    },
    [onMouseUp]
  );

  const onMoreClicked = useCallback((event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  return (
    <Card className={classes.card}>
      <CardActionArea
        disableRipple
        disabled={!buffer}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        classes={{
          focusHighlight: cornerIconEntered
            ? classes.cardDisableHover
            : undefined,
        }}
        className={classes.cardActionArea}
      >
        <CardHeader
          title={title}
          classes={{
            action: classes.headerAction,
            title: classes.headerTitle,
            content: classes.headerTitleContainer,
          }}
          action={
            <IconButton
              component="div"
              onMouseOver={() => setCornerIconEntered(true)}
              onMouseOut={() => setCornerIconEntered(false)}
              onTouchStart={(evt: React.TouchEvent<HTMLDivElement>) =>
                evt.stopPropagation()
              }
              onTouchEnd={(evt: React.TouchEvent<HTMLDivElement>) =>
                evt.stopPropagation()
              }
              onMouseDown={(evt: React.MouseEvent<HTMLDivElement>) =>
                evt.stopPropagation()
              }
              onMouseUp={(evt: React.MouseEvent<HTMLDivElement>) =>
                evt.stopPropagation()
              }
              onClick={onMoreClicked}
            >
              <MoreVertIcon />
            </IconButton>
          }
          style={{ padding: "4px 0px" }}
        />
        <SampleMenu
          id={id}
          anchorEl={anchorEl}
          onClose={useCallback(() => setAnchorEl(null), [])}
        />
        <div ref={divRef} style={{ height: 128 }} />
      </CardActionArea>
      {!buffer && (
        <div className={classes.loadingDiv}>
          <CircularProgress />
        </div>
      )}
    </Card>
  );
});
