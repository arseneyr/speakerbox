import { Grid as MuiGrid, makeStyles } from "@material-ui/core";
import React, {
  ComponentProps,
  ComponentPropsWithRef,
  FunctionComponent,
} from "react";

const useStyles = makeStyles({
  grid: {
    "& > div": {
      height: 80,
    },
  },
});

export const Grid: FunctionComponent = ({ children }) => {
  const classes = useStyles();
  return (
    <MuiGrid className={classes.grid} container spacing={1}>
      {children}
    </MuiGrid>
  );
};

interface GridItemProps extends ComponentProps<typeof MuiGrid> {
  nWide?: 1 | 2 | 3;
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ children, nWide = 1, item, ...rest }, ref) => (
    <MuiGrid
      item
      xs={(6 * nWide) as any}
      sm={(3 * nWide) as any}
      md={(2 * nWide) as any}
      xl={nWide as any}
      ref={ref}
      {...rest}
    >
      {children}
    </MuiGrid>
  )
);
