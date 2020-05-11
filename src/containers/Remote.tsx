import React, { useCallback, useState, useEffect } from "react";
import { Button } from "@material-ui/core";
import Peer from "peerjs";
import { v4 } from "uuid";
import { RemoteServer } from "../redux/remote";
import { useStore } from "react-redux";

export default () => {
  const [serverEnabled, setServerEnabled] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const store = useStore();
  useEffect(() => {
    if (!serverEnabled) {
      return;
    }

    const server = new RemoteServer(store);
    server.id.then(setId);
  }, [serverEnabled, store]);
  useEffect(() => {
    id && window.open(`/?r=${id}`, "_blank");
  }, [id]);
  return <Button onClick={() => setServerEnabled(true)}>Remote!</Button>;
};
