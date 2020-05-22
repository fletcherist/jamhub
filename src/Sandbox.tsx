import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";

export function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const kicks = new Tone.Sampler({
  urls: {
    C1: "kick/kick1.mp3",
    D1: "kick/kick2.mp3",
    E1: "kick/kick3.mp3",
  },
  baseUrl: "https://fletcherist.github.io/jamlib/",
}).toDestination();

const snares = new Tone.Sampler({
  urls: {
    C1: "snare/snare1.mp3",
    D1: "snare/snare2.mp3",
    E1: "snare/snare3.mp3",
    F1: "snare/snare4.mp3",
    G1: "snare/snare5.mp3",
  },
  baseUrl: "https://fletcherist.github.io/jamlib/",
}).toDestination();

interface Sample {
  play: (time: number) => void;
}

const kick = (): Sample => {
  return {
    play: (time: number): void => {
      kicks.triggerAttackRelease("C1", "16n", time);
    },
  };
};
const snare = (): Sample => {
  return {
    play: (time: number): void => {
      snares.triggerAttackRelease("C1", "4n", time);
    },
  };
};
const silence = (): Sample => {
  return {
    play: () => undefined,
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

const grid: Array<Sample[]> = [
  [kick()],
  [silence()],
  [silence()],
  [silence()],
  [kick(), snare()],
  [silence()],
  [silence()],
  [silence()],
  [kick()],
  [silence()],
  [silence()],
  [silence()],
  [kick(), snare()],
  [silence()],
  [silence()],
  [silence()],
];

const loop = new Tone.Sequence(
  (time, count) => {
    console.log("samples", count);
    const samples = grid[count];
    for (const sample of samples) {
      sample.play(time);
    }
    // for (const sample of samples) {
    //   sample.play(time);
    // }

    // console.log(
    //   col,
    //   "Tone.Transport.now()",
    //   // Tone.Transport.now(),
    //   Tone.Transport.position
    // );

    // const now = new Date();
    // const { bars, beats } = getPosition(now);
    // const [toneBars, toneBeats] = Tone.Transport.position.toString().split(":");

    // console.log(
    //   "seconds",
    //   now.getSeconds(),
    //   "bars",
    //   bars,
    //   "tone bars",
    //   toneBars,
    //   "beats",
    //   beats,
    //   "tone beats",
    //   toneBeats
    // );

    // const velocity = Math.random() * 0.5 + 0.5;

    // synth.triggerAttackRelease(notes[col], "16n", time, velocity);
    // var column = document.querySelector("tone-step-sequencer").currentColumn;
    // column.forEach(function(val, i){
    // 	if (val){
    // 		//slightly randomized velocities
    // 		keys.get(noteNames[i]).start(time, 0, "32n", 0, vel);
    // 	}
    // });
    //set the columne on the correct draw frame
    // Tone.Draw.schedule(() => {
    //   // document.querySelector("tone-step-sequencer").setAttribute("highlight", col);
    // }, time);
  },
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  // [[kick()]],
  "16n"
).start("0m");

//bind the interface
// document.querySelector("tone-transport").bind(Tone.Transport);
Tone.Transport.on("loopStart", (...args) => {
  console.log(args);
});
Tone.Transport.on("stop", () => {
  setTimeout(() => {
    // document.querySelector("tone-step-sequencer").setAttribute("highlight", "-1");
  }, 100);
});

// https://d9olupt5igjta.cloudfront.net/samples/sample_files/12068/11209b403e60dc9cab69a11664cb14e82d869bcc/mp3/_80_bpm_DRUMS.mp3
export const Loops: React.FC = () => {
  return (
    <div>
      <button
        onClick={async () => {
          await Tone.start();
          // player.start();
          Tone.Transport.bpm.value = 60;
          Tone.Transport.loopStart = "0m";
          Tone.Transport.loopEnd = "4m";
          Tone.Transport.loop = true;

          const now = new Date();
          const nextSecond = (Math.floor(now.getTime() / 1000) + 1) * 1000;
          const durationNowNextSecond = nextSecond - now.getTime(); // duration between now and next second
          const durationInSeconds = durationNowNextSecond / 1000;

          const { bars, beats } = getPosition(now);
          console.log("seconds", now.getSeconds(), "bars", bars);

          console.log("start in", durationInSeconds);
          Tone.Transport.start(`+${durationInSeconds}`, `${bars}:${beats}:0`);
          // Tone.Transport.position = "0:0:2";
          // Tone.Transport.start(`+${durationInSeconds}`);
          console.log("started");
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
      <button
        onClick={() => {
          loop.start("0m");
        }}
      >
        play loop
      </button>
      hello world
    </div>
  );
};
