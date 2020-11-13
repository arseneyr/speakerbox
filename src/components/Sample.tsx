import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardActionArea,
  CardHeader,
  IconButton,
  CircularProgress,
  makeStyles,
} from "@material-ui/core";
import Edit from "@material-ui/icons/Edit";

const useStyles = makeStyles({
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

interface Props {
  loading?: boolean;
  title?: string;
  onEditClick?(): void;
  onPlay(): void;
  onStop(): void;
}

export default (props: Props) => {
  const { loading, title, onEditClick, onPlay, onStop } = props;
  const classes = useStyles();
  const [cornerIconEntered, setCornerIconEntered] = useState(false);
  const holdToPlayTimerRef = useRef<number | null>(null);
  const holdToPlay = useRef<boolean>(false);
  const touchTimerRef = useRef<number | null>(null);

  const onMouseDown = useCallback(() => {
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
    }
    onPlay();
    holdToPlay.current = false;
    holdToPlayTimerRef.current = window.setTimeout(() => {
      holdToPlayTimerRef.current = null;
      holdToPlay.current = true;
    }, 500);
  }, [onPlay]);

  const onMouseUp = useCallback(() => {
    if (holdToPlayTimerRef.current) {
      clearTimeout(holdToPlayTimerRef.current);
      holdToPlayTimerRef.current = null;
    } else if (holdToPlay.current) {
      onStop();
    }
  }, [onStop]);

  const onTouchStart = useCallback(
    (event) => {
      touchTimerRef.current = window.setTimeout(() => {
        touchTimerRef.current = null;
        onMouseDown();
      }, 50);
    },
    [onMouseDown]
  );

  const onTouchMove = useCallback((evt) => {
    evt.preventDefault();
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const onTouchEnd = useCallback(
    (evt) => {
      evt.preventDefault();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
        onPlay();
      } else {
        onMouseUp();
      }
    },
    [onMouseUp, onPlay]
  );

  return (
    <Card className={classes.card}>
      <CardActionArea
        disableRipple
        disabled={loading}
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
            onEditClick && (
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
                onClick={onEditClick}
              >
                <Edit />
              </IconButton>
            )
          }
          style={{ padding: "4px 0px" }}
        />
        <div style={{ height: 128 }} />
      </CardActionArea>
      {/* {loading && (
        <div className={classes.loadingDiv}>
          <CircularProgress />
        </div>
      )} */}
    </Card>
  );
};
