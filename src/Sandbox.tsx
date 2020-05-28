import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";
import { instruments } from "./instruments";

export function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

interface Sample {
  play: (time: number) => void;
}
interface SampleOptions {
  velocity: number;
  delay: number;
}
const defaultOptions: SampleOptions = {
  velocity: 60,
  delay: 0, // in ms
};

const kick = (modifiedOptions?: Partial<SampleOptions>): Sample => {
  const options: SampleOptions = { ...defaultOptions, ...modifiedOptions };
  return {
    play: (time: number): void => {
      instruments.drums.triggerAttackRelease(
        "C4",
        "16n",
        time + options.delay / 1000,
        options.velocity / 127
      );
    },
  };
};
const snare = (modifiedOptions?: Partial<SampleOptions>): Sample => {
  const options: SampleOptions = { ...defaultOptions, ...modifiedOptions };
  return {
    play: (time: number): void => {
      instruments.drums.triggerAttackRelease(
        "E4",
        "4n",
        time + options.delay / 1000,
        options.velocity / 127
      );
    },
  };
};
const hat = (modifiedOptions?: Partial<SampleOptions>): Sample => {
  const options: SampleOptions = { ...defaultOptions, ...modifiedOptions };
  return {
    play: (time: number): void => {
      instruments.drums.triggerAttackRelease(
        "D4",
        "4n",
        time + options.delay / 1000,
        options.velocity / 127
      );
    },
  };
};

export interface Sequence {
  start: () => void;
  stop: () => void;
}
export const emptySequence: Sequence = {
  start: () => undefined,
  stop: () => undefined,
};

export const createDrumLoop = (): Sequence => {
  const grid: Array<Sample[]> = [
    [kick()],
    [],
    [hat({ velocity: 30 })],
    [],
    [kick(), snare({ velocity: 70 })],
    [],
    [hat({ velocity: 20 })],
    [kick({ delay: 60, velocity: 30 })],
    [kick()],
    [],
    [hat({ velocity: 20 })],
    [],
    [kick(), snare({ velocity: 60 })],
    [],
    [hat({ velocity: 20 })],
    [],
  ];
  const drumLoop1 = new Tone.Sequence(
    (time, count) => {
      // console.log("samples", count);
      const samples = grid[count];
      for (const sample of samples) {
        sample.play(time);
      }
      // Tone.Draw.schedule(() => {
      //   // document.querySelector("tone-step-sequencer").setAttribute("highlight", col);
      // }, time);
    },
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    "16n"
  );
  return {
    stop: () => drumLoop1.stop(0),
    start: () => drumLoop1.start(0),
  };
};

const getPosition = (date: Date): { bars: number; beats: number } => {
  const unix = Math.floor(date.getTime() / 1000);
  const ticks = unix % 16;
  console.log("ticks", ticks);
  const beats = ticks % 4;
  const bars = Math.floor(ticks / 4);
  return { bars, beats };
};

export async function startTransportSync() {
  await Tone.start();
  Tone.Transport.bpm.value = 60;
  Tone.Transport.loopStart = "0m";
  Tone.Transport.loopEnd = "4m";
  Tone.Transport.loop = true;

  const now = new Date();
  const nextSecond = (Math.floor(now.getTime() / 1000) + 1) * 1000;
  const durationNowNextSecond = nextSecond - now.getTime(); // duration between now and next second
  const durationInSeconds = durationNowNextSecond / 1000;

  const { bars, beats } = getPosition(now);
  // console.log("seconds", now.getSeconds(), "bars", bars);
  // console.log("start in", durationInSeconds);
  Tone.Transport.start(`+${durationInSeconds}`, `${bars}:${beats}:0`);
  // Tone.Transport.position = "0:0:2";
  // Tone.Transport.start(`+${durationInSeconds}`);
}

export const Loops: React.FC = () => {
  return (
    <div>
      <button
        onClick={async () => {
          startTransportSync();
        }}
      >
        start
      </button>
      <button
        onClick={() => {
          Tone.Transport.pause();
        }}
      >
        pause
      </button>
      <button
        onClick={() => {
          Tone.Transport.stop();
        }}
      >
        stop
      </button>
      hello world
    </div>
  );
};
