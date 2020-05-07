import React from "react";
import * as Tone from "tone";

import css from "./App.module.css";

const synth = new Tone.Synth().toMaster();

function App() {
  return (
    <div className={css.container}>
      <button
        onClick={async () => {
          await Tone.start();
          console.log("audio is ready");
          synth.triggerAttackRelease("C4", "8n");
        }}
      >
        play
      </button>
      <p></p>
    </div>
  );
}

export default App;
