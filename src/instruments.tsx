import * as Tone from "tone";
import { Piano } from "@tonejs/piano";

const ORIGIN = "https://fletcherist.github.io/webaudiomodules";

export const loadWAMProcessor = (audioContext: AudioContext): Promise<void> =>
  audioContext.audioWorklet.addModule(`${ORIGIN}/wam-processor.js`);

interface WAMControllerOptions {
  numberOfInputs: number;
  numberOfOutputs: number;
  outputChannelCount: number[];
}

class WAMController extends AudioWorkletNode {
  constructor(
    context: AudioContext,
    processorName: string,
    options: WAMControllerOptions
  ) {
    super(context, processorName, options);
  }

  setParam(key: any, value: any) {
    console.log("setParam", key, value);
    this.port.postMessage({ type: "param", key: key, value: value });
  }

  setPatch(patch: any): void {
    this.port.postMessage({ type: "patch", data: patch });
  }

  setSysex(sysex: any): void {
    this.port.postMessage({ type: "sysex", data: sysex });
  }

  onMidi(msg: any): void {
    this.port.postMessage({ type: "midi", data: msg });
  }

  sendMessage(verb: any, prop: any, data: any) {
    this.port.postMessage({
      type: "msg",
      verb: verb,
      prop: prop,
      data: data,
    });
  }
}

export class DX7 extends WAMController {
  public banks: string[];
  public presets: Map<string, number[]>;
  // public patches: string[];
  // public bank: string[];
  constructor(audioContex: AudioContext) {
    const options: WAMControllerOptions = {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    };
    super(audioContex, "wam-dx7", options);

    this.banks = [
      "rom1A.syx",
      "steinber.syx",
      "SynprezFM_03.syx",
      "weird1.syx",
      "solange2.syx",
      "analog1.syx",
      "Dexed_01.syx",
    ];
    this.presets = new Map<string, number[]>();
    // this.patches = [];
    // this.bank = [];
  }

  get title() {
    return "webDX7";
  }
  get defpatch() {
    return 10;
  }

  static async importScripts(audioContex: AudioContext) {
    await audioContex.audioWorklet.addModule(`${ORIGIN}/dx7/dx7-wasm.js`);
    await audioContex.audioWorklet.addModule(`${ORIGIN}/dx7/dx7-loader.js`);
    await audioContex.audioWorklet.addModule(`${ORIGIN}/dx7/dx7-awp.js`);
    return;
  }

  async loadBank(filename: string) {
    function extractName(data: any[]): string {
      var offset = 118; // 118 for packed, 145 for unpacked
      var name = "";
      for (var n = 0; n < 10; n++) {
        var c = data[n + offset];
        switch (c) {
          case 92:
            c = "Y";
            break; // yen
          case 126:
            c = ">";
            break; // >>
          case 127:
            c = "<";
            break; // <<
          default:
            if (c < 32 || c > 127) c = 32;
            break;
        }
        name += String.fromCharCode(c);
      }
      return name;
    }
    const resp = await fetch(`${ORIGIN}/dx7/presets/${filename}`);
    let data = await resp.arrayBuffer();
    if (data.byteLength !== 4104) {
      throw new Error("data.byteLength !== 4104");
    }
    this.presets.clear();
    data = new Uint8Array(data);
    data = (data as any).subarray(6, 4102);
    for (var i = 0; i < 32; i++) {
      var offset = i * 128;
      const voice = (data as any).subarray(offset, offset + 128);
      const name = extractName(voice);
      this.presets.set(name, voice);
    }
    return this.presets;
  }
}

//connect it to the speaker output
const effectReverb = new Tone.Reverb({
  decay: 10,
  wet: 0.5,
});
effectReverb.toDestination();
const effectDelay = new Tone.Delay({
  delayTime: 0.3,
  maxDelay: 3,
});
effectDelay.toDestination();
// const effectTremolo = new Tone.Tremolo(9, 0.75).toDestination().start();

const piano = new Piano({
  velocities: 5,
});
piano.connect(effectReverb);

const sine = new Tone.Synth({
  oscillator: {
    type: "sine",
  },
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.3,
    release: 1,
  },
});
const sineGain = new Tone.Gain(0.5);
sine.connect(sineGain).connect(effectReverb);

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
    D4: samples["hat6"],
    E4: samples["snare1"],
  },
}).connect(new Tone.Gain(0.4).toDestination());

export const effects = {
  effectReverb,
  effectDelay,
};
export const instruments = {
  piano,
  sine,
  drums,
};
