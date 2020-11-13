import React, { useState, useEffect, useRef } from "react";
import {
  makeStyles,
  ButtonBase,
  Theme,
  Zoom,
  Tooltip,
} from "@material-ui/core";
import { CSSTransition } from "react-transition-group";
import { GridItem } from "./Grid";
import { Skeleton } from "@material-ui/lab";
import { useWindowWidth } from "../hooks";

const useStyles = makeStyles<Theme, { duration: number; startPercent: number }>(
  {
    skeleton: {
      borderRadius: 8,
    },
    button: {
      width: "100%",
      borderRadius: 8,
      backgroundColor: "#565656",
      transition: "opacity 100ms",
      "&:hover > $title": {
        opacity: 1,
      },
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      "$skeleton > &": {
        opacity: 0.5,
        visibility: "unset",
      },
    },
    title: {
      transition: "opacity 200ms",
      opacity: 0.8,
      padding: "8px 8px 0 8px",
      boxSizing: "content-box",
      height: "2.4em",
      lineHeight: "1.2em",
      font: `italic 800 24px "Merriweather Sans"`,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      "-webkit-line-clamp": 2,
      "-webkit-box-orient": "vertical",
      overflowWrap: "anywhere",
    },
    progress: {
      height: 8,
      width: "100%",
      background: "linear-gradient(to left, #FF6BF9, #FF7A9A)",
      clipPath: (props) => `inset(0 ${props.startPercent}% 0 0)`,
    },
    progressEnterActive: {
      "&&": {
        clipPath: "inset(0 0 0 0)",
      },
      transition: (props) =>
        props.duration ? `clip-path ${props.duration}ms linear` : undefined,
    },
    progressEnterDone: {
      clipPath: "unset",
    },
    progressExit: {
      clipPath: "unset",
      opacity: 1,
    },
    progressExitActive: {
      opacity: 0,
      transition: "opacity 2s ease-in",
    },
    progressExitDone: {
      opacity: 0,
    },
  }
);

interface SampleProps {
  title?: string;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  playbackStart?: number;
  durationMs?: number;
  loading?: boolean;
}

const Sample: React.FunctionComponent<SampleProps> = (props) => {
  const {
    title,
    playbackStart,
    durationMs,
    loading,
    onMouseDown,
    onMouseUp,
  } = props;

  const titleDiv = useRef<HTMLDivElement>(null);
  const [adjustedDuration, setAdjustedDuration] = useState(0);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltip, setTooltip] = useState("");
  const width = useWindowWidth;

  const startPercent =
    durationMs && playbackStart && !loading
      ? Math.max(0, 1 - (Date.now() - playbackStart) / durationMs) * 100
      : 100;

  const classes = useStyles({ duration: adjustedDuration, startPercent });
  const [currentPlaybackStart, setCurrentPlaybackStart] = useState(
    playbackStart
  );

  useEffect(() => {
    setCurrentPlaybackStart(playbackStart);
    if (playbackStart && durationMs) {
      const ad = durationMs - Date.now() + playbackStart;
      setAdjustedDuration(ad);
      setTooltipOpen(false);
      let timer: any = setTimeout(() => {
        setAdjustedDuration(0);
        timer = null;
      }, ad);
      return () => {
        setAdjustedDuration(0);
        timer && clearTimeout(timer);
        timer = null;
      };
    }
  }, [playbackStart, durationMs]);

  useEffect(() => {
    if (
      titleDiv.current &&
      titleDiv.current.scrollHeight > titleDiv.current.offsetHeight
    ) {
      setTooltip(title ?? "");
    } else {
      setTooltip("");
    }
  }, [width, title]);

  const Button = (
    <ButtonBase
      className={classes.button}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      disabled={loading}
    >
      <Tooltip
        title={tooltip}
        open={tooltipOpen}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
      >
        <div ref={titleDiv} className={classes.title}>
          {title}
        </div>
      </Tooltip>
      <CSSTransition
        in={
          currentPlaybackStart === playbackStart &&
          !!adjustedDuration &&
          !loading
        }
        timeout={{
          enter: adjustedDuration,
          exit: 2000,
        }}
        classNames={{
          enterActive: classes.progressEnterActive,
          enterDone: classes.progressEnterDone,
          exit: classes.progressExit,
          exitActive: classes.progressExitActive,
          exitDone: classes.progressExitDone,
        }}
      >
        <div className={classes.progress} />
      </CSSTransition>
    </ButtonBase>
  );

  return (
    <Zoom in={true} appear>
      <GridItem>
        {loading ? (
          <Skeleton
            height="73.6px"
            width="100%"
            variant="rect"
            animation="wave"
            className={classes.skeleton}
          >
            {Button}
          </Skeleton>
        ) : (
          Button
        )}
      </GridItem>
    </Zoom>
  );
};

export default Sample;
