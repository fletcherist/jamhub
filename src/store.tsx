import React, { useRef, useContext } from "react";
const createAudioContext = (): AudioContext => {
  window.AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContext();
  return audioContext;
};
const AudioContextContext = React.createContext<AudioContext | undefined>(
  undefined
);
export const AudioContextProvider: React.FC = ({ children }) => {
  const refAudioContext = useRef<AudioContext>();
  if (!refAudioContext.current) {
    refAudioContext.current = createAudioContext();
  }
  return (
    <AudioContextContext.Provider value={refAudioContext.current}>
      {children}
    </AudioContextContext.Provider>
  );
};
export const useAudioContext = (): AudioContext => {
  const audioContext = useContext(AudioContextContext);
  if (!audioContext) {
    throw new Error("AudioContext is not initialized");
  }
  return audioContext; // audio context is always defined, but may be in suspended state
};
