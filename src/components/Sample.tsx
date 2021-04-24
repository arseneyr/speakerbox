import React, { useState, useEffect, useRef, HTMLProps } from "react";
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

const useStyles = makeStyles<Theme, SampleProps>((theme) => ({
  skeleton: {
    borderRadius: 8,
    width: "100%",
    height: "100%",
    minWidth: "100%",
  },
  button: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#565656",
    transition: "color 100ms",
    color: theme.palette.text.secondary,
    "&:hover": {
      color: theme.palette.text.primary,
      // opacity: 1,
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
    // transition: "opacity 200ms",
    // opacity: 0.8,
    // padding: "8px 8px 0 8px",
    margin: "auto 8px",
    boxSizing: "content-box",
    // height: "2.4em",
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
    clipPath: ({ durationMs, playbackStart, loading }) =>
      `inset(0 ${
        durationMs && playbackStart && !loading
          ? Math.max(0, 1 - (Date.now() - playbackStart) / durationMs) * 100
          : 100
      }% 0 0)`,
  },
  progressEnterActive: {
    "&&": {
      clipPath: "inset(0 0 0 0)",
    },
    transition: ({ durationMs, playbackStart }) =>
      durationMs && playbackStart && Date.now() - playbackStart < durationMs
        ? `clip-path ${durationMs - Date.now() + playbackStart}ms linear`
        : undefined,
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
}));

interface SampleProps {
  title?: string;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  playbackStart?: number;
  durationMs?: number;
  loading?: boolean;
}

const TitleDiv = React.forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  (props, ref) => {
    const { title, children, ...rest } = props;
    return (
      <div ref={ref} {...rest}>
        {children}
      </div>
    );
  }
);

const Sample: React.FunctionComponent<SampleProps> = (props) => {
  const {
    title,
    playbackStart,
    durationMs,
    loading,
    onMouseDown,
    onMouseUp,
  } = props;

  const titleDivRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltip, setTooltip] = useState("");
  const [currentPlaybackStart, setCurrentPlaybackStart] = useState(
    playbackStart
  );
  const width = useWindowWidth;

  const classes = useStyles(props);

  useEffect(() => {
    setCurrentPlaybackStart(playbackStart);
    if (playbackStart && durationMs) {
      setDone(false);
      setTooltipOpen(false);
      const durationRemaining = durationMs - Date.now() + playbackStart;
      let timer: any = setTimeout(() => {
        setDone(true);
        timer = null;
      }, durationRemaining);
      return () => {
        timer && clearTimeout(timer);
        timer = null;
      };
    }
  }, [playbackStart, durationMs]);

  useEffect(() => {
    if (
      titleDivRef.current &&
      titleDivRef.current.scrollHeight > titleDivRef.current.offsetHeight
    ) {
      setTooltip(title ?? "");
    } else {
      setTooltip("");
    }
  }, [width, title]);

  const button = (
    <ButtonBase
      className={classes.button}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      disabled={loading}
    >
      <Tooltip
        title={tooltip}
        open={tooltipOpen}
        // enterDelay={1000}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
      >
        <TitleDiv ref={titleDivRef} className={classes.title}>
          {title}
        </TitleDiv>
      </Tooltip>
      <CSSTransition
        in={currentPlaybackStart === playbackStart && !done && !loading}
        timeout={{
          enter: Math.max(
            0,
            (durationMs ?? 0) - Date.now() + (playbackStart ?? 0)
          ),
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
            variant="rect"
            animation="wave"
            className={classes.skeleton}
          >
            {button}
          </Skeleton>
        ) : (
          button
        )}
      </GridItem>
    </Zoom>
  );
};

export default Sample;
