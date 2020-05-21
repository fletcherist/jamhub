import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";

const player = new Tone.Player({
  url:
    "https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/E4.mp3",
}).toDestination();

const synth = new Tone.Synth().toDestination();

export function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const notes = ["C4", "D3", "E3", "G3", "F3"];

// //play a note every quarter-note
// const loop = new Tone.Loop((time) => {
//   console.log("loop trigger", time);
//   synth.triggerAttackRelease(note, "8n", time);
// }, "4n");

const loop = new Tone.Sequence(
  (time, col) => {
    console.log(col);
    const velocity = Math.random() * 0.5 + 0.5;
    synth.triggerAttackRelease(sample(notes), "16n", time, velocity);
    // var column = document.querySelector("tone-step-sequencer").currentColumn;
    // column.forEach(function(val, i){
    // 	if (val){
    // 		//slightly randomized velocities
    // 		keys.get(noteNames[i]).start(time, 0, "32n", 0, vel);
    // 	}
    // });
    //set the columne on the correct draw frame
    Tone.Draw.schedule(() => {
      // document.querySelector("tone-step-sequencer").setAttribute("highlight", col);
    }, time);
  },
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
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
          Tone.Transport.loopEnd = "1m";
          Tone.Transport.loop = true;

          const now = new Date();
          const nextSecond = (Math.floor(now.getTime() / 1000) + 1) * 1000;
          const durationNowNextSecond = nextSecond - now.getTime(); // duration between now and next second
          const durationInSeconds = durationNowNextSecond / 1000;

          console.log("start in", durationInSeconds);
          Tone.Transport.start(`+${durationInSeconds}`, "3:0:0");
          console.log("started");
        }}
      >
        start
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
