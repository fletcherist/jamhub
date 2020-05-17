import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { MIDIEvent } from "./lib";
import { UserKeyboard, MyKeyboard } from "./Keyboard";

const player = new Tone.Player({
  url:
    "https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/E4.mp3",
}).toDestination();

const ORIGIN = "https://fletcherist.github.io/webaudiomodules";

export const loadWAMProcessor = (audioContext: AudioContext): Promise<void> =>
  audioContext.audioWorklet.addModule(`${ORIGIN}/wam-processor.js`);

interface WAMControllerOptions {
  numberOfInputs: number;
  numberOfOutputs: number;
  outputChannelCount: number[];
}

// interface WAMController extends AudioWorkletNode {
// }
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
  private banks: string[];
  private patches: string[];
  private bank: string[];
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
    this.patches = [];
    this.bank = [];
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
    function extractName(data: any[]) {
      console.log("extractName", data);
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
    this.patches = [];
    this.bank = [];
    data = new Uint8Array(data);
    data = (data as any).subarray(6, 4102);
    for (var i = 0; i < 32; i++) {
      var offset = i * 128;
      var voice = (data as any).subarray(offset, offset + 128);
      var name = extractName(voice);
      this.patches.push(name);
      this.bank.push(voice);
    }
    return this.patches;
  }
}
// const importDoc = document.currentScript.ownerDocument;
// const template = importDoc.querySelector("#wam-host-template");

// -- having to use ES6 here sux
// class WamHost extends HTMLElement {
//   constructor() {
//     super();
//     this._actx = undefined;
//     this._root = this.attachShadow({ mode: "open" });
//     this._root.appendChild(template.content.cloneNode(true));
//     this._inited = false;
//     this.velocity = 80;
//   }

//   set context(actx) {
//     this._actx = actx;
//   }
//   get context() {
//     return this._actx;
//   }
//   set src(url) {
//     this.load(url);
//   }

//   static get observedAttributes() {
//     return ["src"];
//   }
//   attributeChangedCallback(name, oldValue, newValue) {
//     if (name == "src") this.load(newValue);
//   }

//   async load(url) {
//     window.addEventListener("mousedown", () => this._actx.resume());
//     window.addEventListener("keydown", () => this._actx.resume());
//     if (!this._actx) {
//       this._actx = new AudioContext();
//     }
//     const res = await this._actx.audioWorklet.addModule(
//       `${ORIGIN}/wam-processor.js`
//     );
//     await DX7.importScripts(this._actx);
//     const wam = await new DX7(this._actx);
//     this._initPresets(wam);
//     setInterval(() => {
//       const note = 40;
//       wam.onMidi([0x90, note, 120]);
//       setTimeout(() => {
//         wam.onMidi([0x80, note, 120]);
//       }, 500);
//     }, 1000);
//     wam.connect(wam.context.destination);
//     return wam;
//   }

//   _initPresets(plug) {
//     // -- populate comboboxes
//     // var self = this;
//     // var banks = this._root.getElementById("banks");
//     // var patches = this._root.getElementById("patches");
//     // banks.innerHTML = "";
//     // patches.innerHTML = "";
//     // self._inited = false;
//     // plug.banks.forEach((name) => {
//     //   banks.appendChild(new Option(name));
//     // });

//     // // -- change bank
//     // banks.onchange = async (event) => {
//     //   const bank = await plug.loadBank(event.target.value);
//     //   patches.innerHTML = "";
//     //   bank.forEach((name) => {
//     //     patches.appendChild(new Option(name));
//     //   });
//     //   if (!self._inited) {
//     //     self._inited = true;
//     //     patches.selectedIndex = plug.defpatch ? plug.defpatch : 0;
//     //   }
//     //   patches.onchange({ target: patches });
//     // };
//     // banks.onchange({ target: banks });

//     // // -- change patch
//     // patches.onchange = (event) => {
//     //   const selectedPatch = event.target.selectedIndex;
//     //   if (plug.selectPatch) {
//     //     plug.selectPatch(selectedPatch);
//     //   } else {
//     //     var patch = plug.getPatch
//     //       ? plug.getPatch(selectedPatch)
//     //       : plug.bank[selectedPatch];
//     //     plug.setPatch(patch);
//     //   }
//     // };
//   }
// }

// https://d9olupt5igjta.cloudfront.net/samples/sample_files/12068/11209b403e60dc9cab69a11664cb14e82d869bcc/mp3/_80_bpm_DRUMS.mp3
export const Loops: React.FC = () => {
  const refWam = useRef<DX7>();
  useEffect(() => {
    async function main() {
      try {
        const audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule(`${ORIGIN}/wam-processor.js`);
        await DX7.importScripts(audioContext);
        const wam = new DX7(audioContext);
        wam.connect(wam.context.destination);
        refWam.current = wam;
      } catch (error) {
        console.error(error);
      }
    }
    main();
  }, []);
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
      <MyKeyboard
        onMIDIEvent={(event) => {
          if (!refWam.current) {
            throw new Error("dx7 is not initialized");
          }
          refWam.current.onMidi(event);
        }}
      />
    </div>
  );
};
