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
