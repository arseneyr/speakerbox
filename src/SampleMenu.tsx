import React, { useCallback, useRef, PropsWithChildren } from "react";
import { Menu, MenuItem as MuiMenuItem } from "@material-ui/core";
import { useDispatch } from "react-redux";
import { startEditing, deleteSample } from "./redux/samples";

interface MenuProps {
  id: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

type MenuItemProps = PropsWithChildren<{
  refCollection: React.MutableRefObject<HTMLLIElement[]>;
  onClick: () => void;
}>;

const MenuItem = ({ refCollection, onClick, children }: MenuItemProps) => (
  <MuiMenuItem
    onTouchStart={(event: TouchEvent) => {
      event.stopPropagation();
      onClick();
    }}
    onClick={onClick}
    component={(props) => (
      <li ref={(r) => r && refCollection.current.push(r)} {...props} />
    )}
  >
    {children}
  </MuiMenuItem>
);

export default ({ id, anchorEl, onClose }: MenuProps) => {
  const menuItemRefs = useRef<HTMLLIElement[]>([]);
  const dispatch = useDispatch();
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onMouseDownCapture={useCallback((event) => event.stopPropagation(), [])}
      onTouchStartCapture={useCallback(
        (event) => {
          if (!menuItemRefs.current.includes(event.target)) {
            event.stopPropagation();
            onClose();
          }
        },
        [onClose]
      )}
      onClose={useCallback(
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        },
        [onClose]
      )}
    >
      <MenuItem
        refCollection={menuItemRefs}
        onClick={useCallback(() => {
          dispatch(startEditing(id));
          onClose();
        }, [id, onClose, dispatch])}
      >
        Edit
      </MenuItem>
      <MenuItem
        refCollection={menuItemRefs}
        onClick={useCallback(() => {
          dispatch(deleteSample(id));
          onClose();
        }, [id, onClose, dispatch])}
      >
        Delete
      </MenuItem>
    </Menu>
  );
};
