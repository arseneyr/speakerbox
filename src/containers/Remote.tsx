import React, { useCallback, useState, useEffect } from "react";
import { Button } from "@material-ui/core";
import Peer from "peerjs";
import { v4 } from "uuid";

function createPeer() {
  const url = process.env.REACT_APP_PEERJS_SERVER
    ? new URL(process.env.REACT_APP_PEERJS_SERVER!)
    : null;
  const peerJsServer = url
    ? {
        host: url.hostname,
        secure: url.protocol === "https:",
        port: url.port
          ? parseInt(url.port)
          : url.protocol === "https:"
          ? 443
          : 80,
        path: url.pathname,
      }
    : {};
  return new Peer({
    debug: process.env.NODE_ENV === "development" ? 3 : undefined,
    ...peerJsServer,
  });
}

const usePeerServer = (enable: boolean) => {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!enable) {
      return;
    }
    const peer = createPeer();
    let connected = false;
    peer.on("connection", (conn) => {
      conn.on("open", () => {
        connected = true;
      });
    });
    peer.on("open", setId);
    return () => {
      connected && peer.destroy();
    };
  }, [enable]);
  return id;
};

export default () => {
  const [serverEnabled, setServerEnabled] = useState(false);
  const id = usePeerServer(serverEnabled);
  return <Button onClick={() => setServerEnabled(true)}>Remote!</Button>;
};
