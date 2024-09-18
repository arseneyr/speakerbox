import React, { ReactNode, useEffect, useState } from "react";
import { selectIsRehydrated } from "./persistor";
import { useAppSelector } from "@app/hooks";

interface PersistGateProps {
  children: ReactNode;
  loading: ReactNode;
  debounceMs?: number;
}

const PersistGate: React.FunctionComponent<PersistGateProps> = (props) => {
  const rehydrated = useAppSelector(selectIsRehydrated);
  const [loading, setLoading] = useState(!props.debounceMs);
  useEffect(() => {
    if (!rehydrated && props.debounceMs) {
      const timeout = setTimeout(() => setLoading(true), props.debounceMs);
      return () => clearTimeout(timeout);
    }
  }, [rehydrated, props.debounceMs]);

  if (rehydrated) {
    return props.children;
  } else if (loading) {
    return props.loading;
  } else {
    return null;
  }
};

export { PersistGate };
