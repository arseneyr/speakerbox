import React, { useContext, useEffect, useRef } from "react";

const AudioContextContext = React.createContext<{
  analyzer: AnalyserNode;
  context: AudioContext;
}>(null as any);

export const AudioContextProvider: React.FunctionComponent = ({ children }) => {
  const acRef = useRef<any>(null);
  if (!acRef.current) {
    const context = new AudioContext();
    const analyzer = context.createAnalyser();
    analyzer.connect(context.destination);
    acRef.current = {
      context,
      analyzer,
    };
  }
  useEffect(
    () => () => {
      acRef.current.context.close();
    },
    []
  );
  return (
    <AudioContextContext.Provider value={acRef.current}>
      {children}
    </AudioContextContext.Provider>
  );
};

export const useAudioContext = () => useContext(AudioContextContext);
