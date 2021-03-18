import React from "react";
import { Fade, makeStyles, Modal, Typography } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  labelContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    outline: "none",
    color: theme.palette.text.secondary,
  },
}));

interface DndOverlayProps {
  open?: boolean;
}

const DndOverlay: React.FunctionComponent<DndOverlayProps> = (props) => {
  const { open } = props;
  const classes = useStyles();
  return (
    <Modal open={open ?? false}>
      <Fade in={open}>
        <div className={classes.labelContainer}>
          <Typography align="center" variant="h3">
            Drop file to add a sample
          </Typography>
        </div>
      </Fade>
    </Modal>
  );
};

export default DndOverlay;
