import React, { useState, useEffect, useCallback } from "react";
import { Button, Popover } from "@material-ui/core";
import { RemoteServer, useRemote } from "../redux/remote";
import QRCode from "react-qr-code";

const RemotePopover = (props: { url: string }) => {
  const { url } = props;

  return (
    <div>
      <QRCode value={url} />
    </div>
  );
};

export default () => {
  const [id, setId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const remote = useRemote() as RemoteServer;
  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      setAnchorEl(event.currentTarget),
    []
  );
  const onClose = useCallback(() => setAnchorEl(null), []);
  useEffect(() => {
    if (!anchorEl || id) {
      return;
    }

    remote.connect();
    remote.id.then(setId);
  }, [anchorEl, id, remote]);
  return (
    <>
      <Button onClick={onClick}>Remote!</Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={onClose}
      >
        {id && <RemotePopover url={`http://192.168.1.248:3000/?r=${id}`} />}
      </Popover>
    </>
  );
};
