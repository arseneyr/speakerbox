import { Grid as MuiGrid, makeStyles } from "@material-ui/core";
import React, { FunctionComponent } from "react";

const useStyles = makeStyles({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    alignContent: "start",
    "& > *": {
      // height: 128,
      width: "100%",
    },
    lineHeight: 1,
  },
  maskContainer: {
    backgroundColor: "#1b0b27",
    mixBlendMode: "multiply",
    pointerEvents: "none",
    minHeight: "100vh",
    fontSize: "32px",
  },
  maskElement: {
    height: "calc(3em + 24px)",
    boxSizing: "content-box",
    backgroundColor: "white",
    borderRadius: 4,
    width: "100%",
  },
});

export const Grid: FunctionComponent = ({ children }) => {
  const styles = useStyles();
  return (
    <>
      <MuiGrid className={styles.container} container spacing={1}>
        {React.Children.map(children, (child) => (
          <MuiGrid item sm={12} md={3} lg={3}>
            {child}
          </MuiGrid>
        ))}
      </MuiGrid>
      <MuiGrid
        className={`${styles.container} ${styles.maskContainer}`}
        container
        spacing={1}
      >
        {React.Children.map(children, () => (
          <MuiGrid item sm={12} md={3} lg={3}>
            <div className={styles.maskElement}></div>
          </MuiGrid>
        ))}
      </MuiGrid>
    </>
  );
};
