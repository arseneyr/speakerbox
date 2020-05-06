import React, { useState } from "react";
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
import Edit from "@material-ui/icons/Edit";

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
  onDivRef(ref: HTMLDivElement): void;
  onMouseDown: React.MouseEventHandler;
  onMouseUp: React.MouseEventHandler;
  onTouchStart: React.TouchEventHandler;
  onTouchEnd: React.TouchEventHandler;
  onTouchMove: React.TouchEventHandler;
  loading: boolean;
  title?: string;
  onEditClick(): void;
}

export default withStyles(styles)(({ classes, ...props }: Props) => {
  const [cornerIconEntered, setCornerIconEntered] = useState(false);

  return (
    <Card className={classes.card}>
      <CardActionArea
        disableRipple
        disabled={props.loading}
        onMouseDown={props.onMouseDown}
        onMouseUp={props.onMouseUp}
        onTouchStart={props.onTouchStart}
        onTouchMove={props.onTouchMove}
        onTouchEnd={props.onTouchEnd}
        classes={{
          focusHighlight: cornerIconEntered
            ? classes.cardDisableHover
            : undefined,
        }}
        className={classes.cardActionArea}
      >
        <CardHeader
          title={props.title}
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
              onClick={props.onEditClick}
            >
              <Edit />
            </IconButton>
          }
          style={{ padding: "4px 0px" }}
        />
        <div ref={props.onDivRef} style={{ height: 128 }} />
      </CardActionArea>
      {props.loading && (
        <div className={classes.loadingDiv}>
          <CircularProgress />
        </div>
      )}
    </Card>
  );
});
