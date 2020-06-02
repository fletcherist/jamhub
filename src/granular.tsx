import React, { useEffect, useRef } from "react";

const random = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const getAudioBuffer = async (
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> => {
  const response = await fetch(url);
  const audioData = await response.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(audioData);
  return buffer;
};

export const createGain = (audioContext: AudioContext, velocity = 0.001) => {
  const gain = audioContext.createGain();
  gain.gain.value = velocity;
  return gain;
};

export const createPan = (audioContext: AudioContext, pan: number) => {
  const panner = audioContext.createStereoPanner();
  return panner;
};

interface Grain {
  busy: boolean;
  gain: GainNode;
  pan: StereoPannerNode;
  source?: AudioBufferSourceNode;
}

interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}
export const createGrain = (
  panVal: number,
  output: AudioNode,
  audioContext: AudioContext
): Grain => {
  const gain = createGain(audioContext);
  const pan = createPan(audioContext, panVal);
  pan.connect(gain);
  gain.connect(output);
  return {
    busy: false,
    gain,
    pan,
  };
};

const getPosition = (
  duration: number,
  position: number,
  spread: number
): number => {
  const spreadOffset = Math.random() * spread - spread / 2;
  const adjustedPos = position * duration;
  return Math.max(0, adjustedPos + spreadOffset);
};

export const killGrain = (grain: Grain) => {
  if (grain.source) {
    grain.source.stop();
    grain.source.disconnect();
  }
  grain.gain.disconnect();
  grain.busy = false;
};

export const startGrain = (grain: Grain, state: GranulaProps) => {
  // Set busy flag so grain doesn't get reused
  grain.busy = true;
  // Create source from buffer
  grain.source = state.audioContext.createBufferSource();
  grain.source.buffer = state.buffer;
  grain.source.connect(grain.pan);
  // Set the pan amount for the grain
  grain.pan.pan.setValueAtTime(
    random(-state.controls.pan, state.controls.pan),
    state.audioContext.currentTime
  );
  // Set the playback rate of the grain
  grain.source.playbackRate.value *= state.controls.playbackRate;
  // Get the starting position in the buffer
  const position = getPosition(
    state.buffer.duration,
    state.controls.position,
    state.controls.spread
  );
  // Calculate curve times
  const now = state.audioContext.currentTime;
  const attackTime = state.controls.adsr.attack;
  const sustainTime = attackTime + state.controls.adsr.sustain;
  const end = sustainTime + state.controls.adsr.release;
  // Apply curves
  grain.source.start(now, position, end / 1000 + 0.1);
  // Attack curve
  grain.gain.gain.exponentialRampToValueAtTime(1, now + attackTime / 1000);
  // Wait sustain amount before invoking release curve
  setTimeout(
    () =>
      // Release curve
      grain.gain.gain.exponentialRampToValueAtTime(0.0001, now + end / 1000),
    // Sustain
    sustainTime
  );
  // Clean up when finished
  setTimeout(() => {
    if (grain.source) {
      grain.source.stop();
      grain.source.disconnect();
    }
    grain.busy = false;
  }, end + 5);
};

export interface GranulaProps {
  audioContext: AudioContext;
  buffer: AudioBuffer;
  controls: {
    adsr: ADSR;
    density: number;
    spread: number;
    position: number;
    pan: number;
    playbackRate: number;
  };
}

interface Granula {
  start: () => void;
  stop: () => void;
}
const createGranula = (props: GranulaProps): Granula => {
  const { audioContext, buffer, controls } = props;
  const state: {
    interval: NodeJS.Timeout | undefined;
    grains: Grain[];
  } = {
    interval: undefined,
    grains: [],
  };
  const master = createGain(audioContext);

  master.gain.value = 0.1;
  master.connect(audioContext.destination);

  const start = () => {
    if (state.interval) {
      return;
    }
    state.interval = setInterval(() => tick(), 1000 / controls.density);
  };
  const stop = () => {
    if (state.interval) {
      clearInterval(state.interval);
    }
    state.interval = undefined;
  };
  const tick = () => {
    const grain = state.grains.find((candidate) => !candidate.busy);
    try {
      if (grain) {
        startGrain(grain, props);
        return;
      }
      const newGrain = createGrain(controls.pan, master, audioContext);
      startGrain(newGrain, props);
      state.grains = [...state.grains, newGrain].slice(0, 20);
    } catch (error) {
      console.error(error);
      stop();
    }
  };
  return {
    start,
    stop,
  };
};

export const Granular: React.FC<GranulaProps> = (props) => {
  const granula = useRef<Granula>();

  useEffect(() => {
    granula.current = createGranula(props);
    granula.current.start();
    return () => {
      if (granula.current) {
        granula.current.stop();
      }
    };
  }, [props]);
  return null;
};
