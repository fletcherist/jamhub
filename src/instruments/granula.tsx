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

export const createGain = (
  audioContext: AudioContext,
  velocity = 0.001
): GainNode => {
  const gain = audioContext.createGain();
  gain.gain.value = velocity;
  return gain;
};

export const createPan = (audioContext: AudioContext): StereoPannerNode => {
  const panner = audioContext.createStereoPanner();
  return panner;
};

interface Grain {
  // source: AudioBufferSourceNode;
  isPlaying: () => boolean;
  play: (props: GranulaProps) => void;
}

interface ADSR {
  attack: number;
  // decay: number;
  sustain: number;
  release: number;
}
export const createGrain = (
  audioContext: AudioContext,
  output: AudioNode
): Grain => {
  const state = {
    busy: false,
  };
  const gain = audioContext.createGain();
  const panner = audioContext.createStereoPanner();
  panner.connect(gain);
  gain.connect(output);

  const play = (props: GranulaProps) => {
    // Set busy flag so grain doesn't get reused
    state.busy = true;
    // Create source from buffer
    const source = props.audioContext.createBufferSource();
    source.buffer = props.buffer;
    source.connect(panner);
    // Set the pan amount for the grain
    panner.pan.setValueAtTime(
      random(-props.controls.pan, props.controls.pan),
      props.audioContext.currentTime
    );
    // Set the playback rate of the grain
    source.playbackRate.value = multiplyTranspose(props.controls.transpose);
    // Get the starting position in the buffer
    const position = getPosition(
      props.buffer.duration,
      props.controls.position,
      props.controls.spread
    );
    // Calculate curve times
    const now = props.audioContext.currentTime;
    const { attack, sustain, release } = props.controls.adsr;

    // convert ms to seconds
    const attackDuration = attack / 1000;
    const sustainDuration = sustain / 1000;
    const releaseDuration = release / 1000;
    const duration = attackDuration + sustainDuration + releaseDuration;
    const durationMs = attack + sustain + release;

    const attackAt = now;
    const sustainAt = attackAt + attackDuration;
    const releaseAt = sustainAt + sustainDuration;
    const endAt = releaseAt + releaseDuration;

    source.start(attackAt, position, duration);
    source.stop(endAt);

    // attack
    gain.gain.setValueAtTime(0, attackAt);
    gain.gain.exponentialRampToValueAtTime(1, sustainAt);
    // sustain
    // release
    gain.gain.setValueAtTime(1, releaseAt);
    gain.gain.exponentialRampToValueAtTime(0.00001, endAt);
    // clean up when finished
    setTimeout(() => {
      source.disconnect();
      state.busy = false;
    }, durationMs);
  };

  return {
    isPlaying: () => state.busy,
    play,
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

// export const killGrain = (grain: Grain) => {
//   if (grain.source) {
//     grain.source.stop();
//     grain.source.disconnect();
//   }
//   grain.gain.disconnect();
//   grain.busy = false;
// };

const multiplyTranspose = (value: number): number => Math.pow(2, value / 12);
// const applyAdsr = (gain: GainNode, audioContext: AudioContext, adsr: ADSR): void => {
//   gain.gain.exponentialRampToValueAtTime(1, audioContext.currentTime + adsr.attack / 1000);
//   setTimeout(
//     () => {
//       // Release curve
//       gain.gain.exponentialRampToValueAtTime(0.0001, now + end / 1000);
//     },
//     // Sustain
//     sustainDuration
//   );
// }

export interface GranulaProps {
  audioContext: AudioContext;
  buffer: AudioBuffer;
  output: AudioNode;
  controls: {
    transpose: number;
    adsr: ADSR; // ms
    density: number;
    spread: number;
    position: number;
    pan: number;
    playbackRate: number;
    reverb: number;
  };
}

interface Granula {
  start: () => void;
  stop: () => void;
}
const createGranula = (props: GranulaProps): Granula => {
  const { audioContext, buffer, controls, output } = props;
  const state: {
    interval: NodeJS.Timeout | undefined;
    grains: Grain[];
  } = {
    interval: undefined,
    grains: [],
  };
  const master = createGain(audioContext);

  master.gain.value = 0.1;
  master.connect(output);

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
    const grain = state.grains.find((candidate) => !candidate.isPlaying());
    try {
      if (grain) {
        grain.play(props);
        return;
      }
      const newGrain = createGrain(audioContext, master);
      newGrain.play(props);
      state.grains = [...state.grains, newGrain].slice(0, 100);
      console.log(state.grains);
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

export interface Reverb {
  input: AudioNode;
  output: AudioNode;
  setWet: (wet: number) => void;
}
export const createReverb = async (
  audioContext: AudioContext
): Promise<Reverb> => {
  const convolver = audioContext.createConvolver();
  const response = await fetch(
    "https://oskareriksson.se/tuna/impulses/impulse_rev.wav"
  );
  const buffer = await response.arrayBuffer();
  convolver.buffer = await audioContext.decodeAudioData(buffer);

  const master = audioContext.createGain();

  const input = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();

  input.connect(dry);
  input.connect(wet);

  dry.connect(master);
  wet.connect(convolver);

  convolver.connect(master);

  return {
    input: input,
    output: master,
    setWet: (wetGain: number) => {
      wet.gain.value = wetGain;
      dry.gain.value = 1 - wetGain;
    },
  };
};
