import React, { useCallback } from "react";
import { RemoteClient, useRemote } from "../redux/remote";
import Sample from "../components/Sample";
import { useSelector } from "react-redux";
import { sampleSelectors } from "../redux/samples";

interface Props {
  id: string;
}

export default (props: Props) => {
  const { id } = props;
  const title = useSelector(
    (state) => sampleSelectors.selectById(state, id)?.title
  );
  const client = useRemote() as RemoteClient;
  const onPlay = useCallback(() => {
    client.sendPlay(id);
  }, [id, client]);
  const onStop = useCallback(() => {
    client.sendStop(id);
  }, [id, client]);
  return <Sample onPlay={onPlay} onStop={onStop} title={title} />;
};
