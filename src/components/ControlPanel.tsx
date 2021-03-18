import React, {
  ComponentPropsWithoutRef,
  ReactElement,
  Ref,
  useEffect,
} from "react";
import {
  ButtonBase,
  Icon,
  makeStyles,
  Typography,
  SvgIcon,
  ButtonBaseProps,
} from "@material-ui/core";
import { GridItem } from "./Grid";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
  controlPanel: {
    width: "100%",
    height: "100%",
    display: "flex",
    backgroundColor: "grey",
    "& > *:first-child": {
      marginLeft: 0,
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
  buttonContainer: {
    margin: "0 2px",
    flexBasis: 80,
    height: "100%",
  },
  droppableButton: {
    width: "100%",
    borderRadius: 4,
    boxShadow: "inset 0px 0px 8px black",
    backgroundColor: "#231942",
    color: theme.palette.text.secondary,
    transition: "color 100ms",
    "&:hover": {
      color: theme.palette.text.primary,
    },
    flexDirection: "column",
    "& > span": {
      lineHeight: 1.5,
    },
  },
  uploadButton: {
    "& > input": { display: "none" },
    "& > label": { display: "block", width: "100%", height: "100%" },
  },
}));

type DroppableButtonProps<
  D extends React.ElementType = "button"
> = ButtonBaseProps<D> & {
  component?: D;
  icon?: typeof SvgIcon;
  iconLabel?: string;
};

export const DroppableButton = React.forwardRef<
  HTMLButtonElement,
  DroppableButtonProps
>((props, ref) => {
  const { className, icon, iconLabel, children, ...rest } = props;
  const IconComponent = icon;
  const classes = useStyles();
  return (
    <ButtonBase
      ref={ref}
      className={clsx(
        className,
        classes.buttonContainer,
        classes.droppableButton
      )}
      {...rest}
    >
      {IconComponent && (
        <Icon>
          <IconComponent />
        </Icon>
      )}
      {iconLabel && <Typography variant="button">{iconLabel}</Typography>}
      {children}
    </ButtonBase>
  );
}) as <D extends React.ElementType = "button">(
  props: DroppableButtonProps<D>,
  ref: Ref<D>
) => ReactElement;

export const UploadButton = React.forwardRef<
  HTMLLabelElement,
  DroppableButtonProps<"label">
>((props, ref) => {
  const { component, ...rest } = props;
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      console.log(e.dataTransfer.types);
    };
    // document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", console.log);
    return () => document.removeEventListener("dragover", onDragOver);
  }, []);
  return (
    <DroppableButton
      ref={ref}
      component="label"
      {...rest}
      onDrop={(e) => {
        e.preventDefault();
        console.log(e);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        style={{ display: "none" }}
        id="upload-button-input"
        type="file"
        multiple
        accept="audio/*, video/*"
      />
    </DroppableButton>
  );
});

interface ControlPanelProps extends ComponentPropsWithoutRef<typeof GridItem> {}

const ControlPanel = React.forwardRef<HTMLDivElement, ControlPanelProps>(
  (props, ref) => {
    const { className, children, ...rest } = props;
    const classes = useStyles();
    return (
      <GridItem
        nWide={2}
        ref={ref}
        className={clsx(className, classes.controlPanel)}
        {...rest}
      >
        {children}
      </GridItem>
    );
  }
);

export default ControlPanel;
