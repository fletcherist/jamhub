import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";

export function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const baseUrl = (url: string): string =>
  "https://fletcherist.github.io/jamlib/" + url;
const samples = {
  // kicks
  kick1: baseUrl("kick/kick1.mp3"),
  kick2: baseUrl("kick/kick2.mp3"),
  kick3: baseUrl("kick/kick3.mp3"),
  // snares
  snare1: baseUrl("snare/snare1.mp3"),
  snare2: baseUrl("snare/snare2.mp3"),
  snare3: baseUrl("snare/snare3.mp3"),
  snare4: baseUrl("snare/snare4.mp3"),
  snare5: baseUrl("snare/snare5.mp3"),
  snare6: baseUrl("snare/snare6.mp3"),
  snare7: baseUrl("snare/snare7.mp3"),
  snare8: baseUrl("snare/snare8.mp3"),
  snare9: baseUrl("snare/snare9.mp3"),
  snare10: baseUrl("snare/snare10.mp3"),
  // hats
  hat1: baseUrl("hat/hat1.mp3"),
  hat2: baseUrl("hat/hat2.mp3"),
  hat3: baseUrl("hat/hat3.mp3"),
  hat4: baseUrl("hat/hat4.mp3"),
  hat5: baseUrl("hat/hat5.mp3"),
  hat6: baseUrl("hat/hat6.mp3"),
  // perc
  perc1: baseUrl("perc/perc1.mp3"),
  perc2: baseUrl("perc/perc2.mp3"),
  perc3: baseUrl("perc/perc3.mp3"),
  perc4: baseUrl("perc/perc4.mp3"),
};

const drums = new Tone.Sampler({
  urls: {
    C4: samples["kick1"],
    D4: samples["perc3"],
    E4: samples["snare1"],
  },
}).toDestination();

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
      drums.triggerAttackRelease(
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
      drums.triggerAttackRelease(
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
      drums.triggerAttackRelease(
        "D4",
        "4n",
        time + options.delay / 1000,
        options.velocity / 127
      );
    },
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
