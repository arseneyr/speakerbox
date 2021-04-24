import { CSSTransition } from "react-transition-group";
import { Theme, withStyles } from "@material-ui/core";
import { Styles } from "@material-ui/core/styles/withStyles";

type AllOrNone<T> = T | { [K in keyof T]?: never };

type SampleProgressBarProps = AllOrNone<{
  remainingMs: number;
  percentStart: number;
}>;

const styles: Styles<Theme, SampleProgressBarProps> = {
  progress: {
    height: 8,
    width: "100%",
    background: "linear-gradient(to left, #FF6BF9, #FF7A9A)",
    clipPath: ({ percentStart }) =>
      `inset(0 ${100 - (percentStart ?? 0)}% 0 0)`,
  },
  progressEnterActive: {
    "&&": {
      clipPath: "inset(0 0 0 0)",
    },
    transition: ({ remainingMs }) =>
      remainingMs ? `clip-path ${remainingMs}ms linear` : undefined,
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
};

const SampleProgressBar = withStyles(styles)(
  ({ percentStart, remainingMs, classes }) => (
    <CSSTransition
      in={remainingMs !== undefined}
      timeout={{
        enter: remainingMs,
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
  )
);
