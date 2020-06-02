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

export const startGrain = (grain: Grain, state: GranularProps) => {
  // Set busy flag so grain doesn't get reused
  grain.busy = true;
  // Create source from buffer
  grain.source = state.audioContext.createBufferSource();
  grain.source.buffer = state.buffer;
  grain.source.connect(grain.pan);
  // Set the pan amount for the grain
  grain.pan.pan.setValueAtTime(
    random(-state.pan, state.pan),
    state.audioContext.currentTime
  );
  // Set the playback rate of the grain
  grain.source.playbackRate.value *= state.playbackRate;
  // Get the starting position in the buffer
  const position = getPosition(
    state.buffer.duration,
    state.position,
    state.spread
  );
  // Calculate curve times
  const now = state.audioContext.currentTime;
  const attackTime = state.attack;
  const sustainTime = attackTime + state.sustain;
  const end = sustainTime + state.release;
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
    // killGrain()
  }, end + 5);
};

export interface GranularProps {
  attack: number;
  buffer: AudioBuffer;
  audioContext: AudioContext;
  density: number;
  gain: number;
  //   output: object;
  pan: number;
  playbackRate: number;
  position: number;
  release: number;
  spread: number;
  sustain: number;
}

export const Granular: React.FC<GranularProps> = (props) => {
  const grains = useRef<Grain[]>([]);
  const master = useRef<GainNode>();
  const interval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    master.current = createGain(props.audioContext, props.gain);
    master.current.gain.value = 0.1;
    master.current.connect(props.audioContext.destination);

    start();
    return () => {
      stop();
      grains.current.forEach(killGrain);
      if (master.current) {
        master.current.disconnect();
      }
    };
  }, [props.audioContext]);

  //   componentWillReceiveProps(next) {
  //     if (next.run !== this.props.run) {
  //       // Detect if we need to start or stop the engine
  //       if (next.run) {
  //         this.start();
  //       } else {
  //         this.stop();
  //       }
  //     } else if (next.density !== this.props.density && this.state.interval) {
  //       // A change in density means we have to adust the interval time
  //       clearInterval(this.state.interval);
  //       this.setState((state) => ({
  //         interval: setInterval(this.tick, 1000 / this.props.density),
  //       }));
  //     } else if (next.gain !== this.props.gain) {
  //       // Change the master gain
  //       const master = this.state.master;
  //       master.gain.value = Math.max(0.001, Math.min(1, next.gain));
  //     }
  //   }

  const start = () => {
    console.log("started");
    if (interval.current) {
      return;
    }
    if (!props.buffer) {
      console.warn("No audio buffer provided!");
      return;
    }
    console.log(1);
    interval.current = setInterval(() => tick(), 1000 / props.density);
  };

  const stop = () => {
    if (interval.current) {
      clearInterval(interval.current);
    }
    interval.current = undefined;
  };

  const tick = () => {
    // console.log("tick");
    const grain = grains.current.find((candidate) => !candidate.busy);
    try {
      if (grain) {
        startGrain(grain, props);
        return;
      }
      if (!master.current) {
        throw new Error("no master");
      }
      const newGrain = createGrain(
        props.pan,
        master.current,
        props.audioContext
      );
      startGrain(newGrain, props);
      grains.current = [...grains.current, newGrain].slice(0, 20);
      //   console.log("grains.length", grains.current.length);
    } catch (error) {
      console.error(error);
      stop();
    }
  };
  return null;
};
