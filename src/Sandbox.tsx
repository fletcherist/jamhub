import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";

const player = new Tone.Player({
  url:
    "https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/E4.mp3",
}).toDestination();

// https://d9olupt5igjta.cloudfront.net/samples/sample_files/12068/11209b403e60dc9cab69a11664cb14e82d869bcc/mp3/_80_bpm_DRUMS.mp3
export const Loops: React.FC = () => {
  return (
    <div>
      <button
        onClick={async () => {
          await Tone.start();
          player.start();
        }}
      >
        play
      </button>
      hello world
    </div>
  );
};
