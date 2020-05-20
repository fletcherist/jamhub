import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";
import cx from "classnames";

import { Room, pingEvent, TransportEvent, delay } from "./lib";

import * as Lib from "./lib";

import { Subject, of, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
// import { LoggerEvent } from "./lib.ts";

import { Piano } from "@tonejs/piano";

import { MyKeyboard, UserKeyboard, UserKeyboardContainer } from "./Keyboard";

import { DX7, loadWAMProcessor } from "./instruments";

import css from "./App.module.css";
import { Center, Instrument } from "./Components";
import {
  Description,
  ButtonGroup,
  Row,
  Card,
  Spacer,
  Text,
  Dot,
  Link,
} from "@zeit-ui/react";

const audioContext = new AudioContext();
Tone.setContext(audioContext);

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
const effectTremolo = new Tone.Tremolo(9, 0.75).toDestination().start();

const piano = new Piano({
  velocities: 5,
});
piano.connect(effectReverb);

// const synth = new Tone.Synth({
//   oscillator: {
//     type: "sine",
//   },
//   envelope: {
//     attack: 0.005,
//     decay: 0.1,
//     sustain: 0.3,
//     release: 1,
//   },
// });
// // synth.connect(effectDelay);
// synth.connect(effectReverb);
// synth.connect(effectTremolo);

// var autoWah = new Tone.AutoWah(50, 6, -30).toMaster();
// //initialize the synth and connect to autowah
// var synth = new Tone.Synth().connect(autoWah);
// //Q value influences the effect of the wah - default is 2
// autoWah.Q.value = 6;
// //more audible on higher notes
// synth.triggerAttackRelease("C4", "8n");

// based on sockette https://github.com/lukeed/sockette
const webSocketReconnect = (
  url: string,
  {
    onopen,
    onerror,
    onclose,
    onmessage,
  }: {
    onopen: (ev: Event) => void;
    onerror: (ev: Event) => void;
    onclose: (ev: CloseEvent) => void;
    onmessage: (ev: MessageEvent) => void;
  }
) => {
  let sock: WebSocket;
  const open = (): void => {
    sock = new WebSocket(url);
    sock.onmessage = onmessage;
    sock.onopen = (event) => onopen(event);
    sock.onclose = async (event) => {
      await delay(1000);
      reconnect();
      onclose(event);
    };
    sock.onerror = (error) => {
      onerror(error);
      sock.close();
    };
  };

  const close = (): void => sock.close();
  const reconnect = () => open();
  const send = (
    data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView
  ): void => sock.send(data);

  open();
  return {
    open,
    close,
    reconnect,
    send,
  };
};

export interface State {
  isMutedMicrophone: boolean;
  isMutedSpeaker: boolean;
  user?: Lib.User;
  room: Room;
}

interface Api {
  roomUserAdd: (user: Lib.User) => void;
  roomUserRemove: (user: Lib.User) => void;
  roomUserUpdate: (user: Lib.User) => void;
}
interface Store {
  state: State;
  update: (partial: Partial<State>) => void;
  api: Api;
}
const defaultState: State = {
  isMutedMicrophone: true,
  isMutedSpeaker: false,
  room: {
    users: [],
  },
};

const StoreContext = React.createContext<Store | undefined>(undefined);
export const StoreProvider: React.FC = ({ children }) => {
  const [state, setState] = useState<State>(defaultState);
  const update = (partial: Partial<State>) =>
    setState({ ...state, ...partial });

  const updateRoom = (partial: Partial<Room>): void => {
    return update({ room: { ...state.room, ...partial } });
  };
  const api: Api = {
    roomUserAdd: (user) => {
      updateRoom({ users: [...state.room.users, user] });
    },
    roomUserRemove: (user) => {
      return updateRoom({
        users: state.room.users.filter((roomUser) => roomUser.id !== user.id),
      });
    },
    roomUserUpdate: (user) => {
      return updateRoom({
        users: state.room.users.map((roomUser) => {
          if (user.id === roomUser.id) {
            return { ...roomUser, ...user };
          }
          return roomUser;
        }),
      });
    },
  };
  return (
    <StoreContext.Provider
      value={{
        state,
        update,
        api,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
export const useStore = (): Store => {
  const context = useContext(StoreContext);
  return context as Store; // store is defined anyway
};

export type MIDIEvent = [number, number, number];
// interface TransportEvent {
//   // note: string;
//   midi: MIDIEvent;
// }

interface LoggerEventConnectionStatus {
  type: "connectionStatus";
  status: TransportStatus;
}
interface LoggerEventPing {
  type: "ping";
  value: number; // ms
}

type LoggerEvent = LoggerEventConnectionStatus | LoggerEventPing;
type TransportStatus = "disconnected" | "connecting" | "connected" | "error";

export interface Transport {
  send: (event: TransportEvent) => void;
  connect: () => { disconnect: () => void };
  events: Observable<LoggerEvent>;
  receive: Observable<TransportEvent>;
}

interface Player {
  send: (event: TransportEvent) => void;
}

const usePlayer = (): Player => {
  const guitar1 = useRef<DX7>();
  const marimba = useRef<DX7>();
  const epiano = useRef<DX7>();

  type Preset = "BRASS   1 " | "GUITAR  1 " | "MARIMBA   " | "E.PIANO 1 ";

  useEffect(() => {
    const loadDx7 = async (preset: Preset): Promise<DX7> => {
      await loadWAMProcessor(audioContext);
      await DX7.importScripts(audioContext);
      const dx7 = new DX7(audioContext);

      Tone.connect(dx7 as AudioNode, effectReverb);
      // dx7.connect(dx7.context.destination);
      await dx7.loadBank("rom1A.syx");
      const presetNames = [...dx7.presets.keys()];
      console.log("presetNames", presetNames);
      dx7.setPatch(dx7.presets.get(preset));
      return dx7;
    };
    async function main() {
      try {
        const [dx7guitar1, dx7marimba, dx7epiano] = await Promise.all([
          loadDx7("GUITAR  1 "),
          loadDx7("MARIMBA   "),
          loadDx7("E.PIANO 1 "),
        ]);
        guitar1.current = dx7guitar1;
        marimba.current = dx7marimba;
        epiano.current = dx7epiano;
      } catch (error) {
        console.error(error);
      }
    }
    main();
  }, []);

  return {
    send: (event: TransportEvent) => {
      if (event.type === "midi") {
        console.log("player", event, event.midi);
        // synth.triggerAttackRelease("C4", "8n");
        // synth.triggerAttackRelease(event.note, "8n");
        const [type, pitch, velocity] = event.midi;

        if (event.instrument === "piano") {
          if (type === 144) {
            piano.keyDown({ midi: pitch, velocity: velocity / 256 });
          } else if (type === 128) {
            piano.keyUp({ midi: pitch });
          }
        } else if (event.instrument === "marimba") {
          if (!marimba.current) {
            console.error("dx7 is not loaded");
            return;
          }
          marimba.current.onMidi(event.midi);
        } else if (event.instrument === "guitar") {
          if (!guitar1.current) {
            console.error("dx7 is not loaded");
            return;
          }
          guitar1.current.onMidi(event.midi);
        } else if (event.instrument === "epiano") {
          if (!epiano.current) {
            console.error("dx7 is not loaded");
            return;
          }
          epiano.current.onMidi(event.midi);
        } else {
          console.error("instrument not implemented", event.instrument);
        }
      }
    },
  };
};

const createLocalTransport = ({ player }: { player: Player }): Transport => {
  const send = new Subject<TransportEvent>();
  const receive = new Subject<TransportEvent>();
  const events = new Subject<LoggerEvent>();
  return {
    send: (event: TransportEvent) => {
      console.log("send", event);
      send.next(event);
    },
    connect: () => {
      const subscription = send.subscribe((event) => {
        player.send(event);
        receive.next(event);
      });
      events.next({ type: "connectionStatus", status: "connected" });
      return {
        disconnect: () => {
          subscription.unsubscribe();
          events.next({ type: "connectionStatus", status: "disconnected" });
        },
      };
    },
    events: events.asObservable(),
    receive: receive.asObservable(),
  };
};

const createWebSocketTransport = ({
  url,
  player,
}: {
  url: string;
  player: Player;
}): Transport => {
  const send = new Subject<TransportEvent>();
  const receive = new Subject<TransportEvent>();
  const events = new Subject<LoggerEvent>();
  let lastSentEventTimestamp: number = Date.now();
  return {
    send: (event: TransportEvent) => {
      send.next(event);
    },
    connect: () => {
      events.next({ type: "connectionStatus", status: "connecting" });
      const sock = webSocketReconnect(url, {
        onclose: (event) => {
          console.log(event);
          events.next({ type: "connectionStatus", status: "disconnected" });
        },
        onerror: (event) => {
          console.error(event);
          events.next({ type: "connectionStatus", status: "error" });
        },
        onopen: (event) => {
          console.log(event);
          events.next({ type: "connectionStatus", status: "connected" });

          sendPipeline.subscribe();
          receivePipeline.subscribe();
        },
        onmessage: (msg) => {
          const event = JSON.parse(msg.data) as TransportEvent;
          // console.log("onmessage", event);
          receive.next(event);
          if (event.type === "ping") {
            events.next({
              type: "ping",
              value: Date.now() - lastSentEventTimestamp,
            });
          }
        },
      });

      // send/receieve data pipelines
      const sendPipeline = send.pipe(
        mergeMap((event) => {
          sock.send(JSON.stringify(event));
          return of(event);
        })
      );
      const receivePipeline = receive.pipe(
        mergeMap((event) => {
          player.send(event);
          return of(event);
        })
      );

      (async () => {
        while (true) {
          await delay(5000);
          lastSentEventTimestamp = Date.now();
          sock.send(JSON.stringify(pingEvent));
        }
      })();

      return {
        disconnect: () => {
          send.complete();
          receive.complete();
          sock.close();
        },
      };
    },
    events: events.asObservable(),
    receive: receive.asObservable(),
  };
};

const Jambox: React.FC = () => {
  const player = usePlayer();

  const webSocketTransport = useRef<Transport>(
    createWebSocketTransport({
      player,
      url: `wss://api.jambox.online${window.location.pathname}`,
      // url: `ws://84.201.149.157${window.location.pathname}`,
      // url: `ws://localhost${window.location.pathname}`,
    })
  );
  // const localTransport = useRef<Transport>(
  //   createLocalTransport({ player })
  // );

  const store = useStore();
  const transport = webSocketTransport.current;
  // const transport = webSocketTransport;
  // const transport = createLocalTransport({ player });
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(
    "disconnected"
  );
  const [pianoStatus, setPianoStatus] = useState<
    "not loaded" | "loading" | "ready"
  >("not loaded");
  const [ping, setPing] = useState<number>(0);
  const [selectedInstrument, setSelectedInstrument] = useState<Lib.Instrument>(
    "epiano"
  );
  const [user, setUser] = useState<Lib.User>();

  const [midiAccess, setMidiAccess] = useState<any | undefined>(undefined);

  useEffect(() => {
    setPianoStatus("loading");
    piano.load().then(() => {
      setPianoStatus("ready");
    });
  }, []);

  useEffect(() => {
    const listener = transport.receive.subscribe((event) => {
      if (event.type === "ping") {
        console.log(event.type);
      } else if (event.type === "user") {
        console.log("user event", event);
        setUser(event.user);
      } else if (event.type === "room") {
        console.log("room event", event);
        store.update({ room: event.room });
      } else if (event.type === "user_join") {
        console.log(event.type, event);
        store.api.roomUserAdd(event.user);
      } else if (event.type === "user_leave") {
        console.log(event.type, event);
        store.api.roomUserRemove(event.user);
      }
    });
    return () => listener.unsubscribe();
  }, [store]);
  useEffect(() => {
    const listener = transport.events
      .pipe(
        mergeMap((event) => {
          console.log(event);
          if (event.type === "connectionStatus") {
            setTransportStatus(event.status);
          } else if (event.type === "ping") {
            setPing(event.value);
          }
          return of(event);
        })
      )
      .subscribe();
    return () => {
      listener.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const conn = transport.connect();
    return () => {
      conn.disconnect();
    };
  }, []);

  useEffect(() => {
    const tryAccessMidi = async (): Promise<void> => {
      try {
        if (midiAccess) {
          console.log("midi access already granted");
          return;
        }
        if (typeof (navigator as any).requestMIDIAccess === "undefined") {
          throw new Error("midi is not supported");
        }
        const midiAccessTry = await (navigator as any).requestMIDIAccess();
        setMidiAccess(midiAccessTry);
      } catch (error) {
        console.error("Could not access your MIDI devices.", error);
      }
    };
    tryAccessMidi();
  }, [midiAccess]);

  useEffect(() => {
    if (!midiAccess || !user) {
      return;
    }
    const midiInputs = [...midiAccess.inputs.values()];
    if (midiInputs.length === 0) {
      console.error("no midi inputs available");
      return;
    }
    const midiInput = midiInputs[0];
    if (!midiInput) {
      console.error(midiInputs, "no midi input", midiInput);
      return;
    }

    const handleMidiEvent = (midiEvent: Event & { data: MIDIEvent }) => {
      const [type, pitch, velocity] = midiEvent.data;
      console.log("handleMidiEvent", midiEvent.data);

      if (type === 144) {
        // note on
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
          user_id: user.id,
        });
      } else if (type === 128) {
        // note off
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
          user_id: user.id,
        });
      }
    };

    midiInput.addEventListener("midimessage", handleMidiEvent);
    return () => {
      midiInput.removeEventListener("midimessage", handleMidiEvent);
    };
  }, [midiAccess, user, selectedInstrument]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!user) {
  //       return;
  //     }
  //     console.log("tick");
  //     transport.send({
  //       midi: [144, 50, 1],
  //       type: "midi",
  //       instrument: "epiano",
  //       user_id: user.id,
  //     });
  //     setTimeout(() => {
  //       transport.send({
  //         midi: [128, 50, 1],
  //         type: "midi",
  //         instrument: "epiano",
  //         user_id: user.id,
  //       });
  //     }, 100);
  //     // 666.6666
  //   }, 1000);
  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [user]);

  const instruments: Lib.Instrument[] = [
    "piano",
    "guitar",
    "marimba",
    "epiano",
    // "🎸", "🎤", "🎺", "🎧", "🥁", "🪕", "🎷"
  ];
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Row style={{ flexGrow: 2 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <h1>users</h1>
          {store.state.room.users.map((roomUser) => {
            return (
              <div>
                <UserKeyboardContainer
                  transport={transport}
                  userId={roomUser.id}
                />
                {/* {roomUser.id} */}
              </div>
            );
          })}
        </div>
        {/* {user && (
        <div>
          <h1>me</h1>
          {user.id}
        </div>
      )} */}
      </Row>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div>
          <Card shadow>
            <Row>
              <div style={{ height: 200 }}>
                <Description title="Instruments" />
                <ButtonGroup vertical style={{ width: 150 }}>
                  {instruments.map((instrument) => {
                    return (
                      <Instrument
                        name={instrument}
                        onClick={() => setSelectedInstrument(instrument)}
                        selected={false}
                      />
                    );
                  })}
                </ButtonGroup>
                <Spacer y={0.5} />
              </div>
              <Spacer x={1} />
              <div>
                <Row>
                  <Text small>
                    piano:{" "}
                    <span
                      style={{
                        ...(pianoStatus === "ready" && { color: "green" }),
                      }}
                    >
                      {pianoStatus}
                    </span>
                  </Text>
                  <Spacer x={0.5} />
                  <Text small>
                    transport:{" "}
                    <span
                      style={{
                        ...(transportStatus === "connected" && {
                          color: "green",
                        }),
                        ...(transportStatus === "error" && { color: "red" }),
                        // color: transportStatus === "connected" ? "green" : "black",
                      }}
                    >
                      {transportStatus}
                    </span>
                  </Text>
                  <Spacer x={0.5} />
                  <Text small>
                    {ping}ms
                    <Dot style={{ marginLeft: 5 }} type="success" />
                  </Text>
                </Row>
                <Spacer y={0.5} />
                <MyKeyboard
                  onMIDIEvent={(event) => {
                    console.log("onMIDIEvent", event);
                    if (!user) {
                      console.error("no user");
                    }
                    transport.send({
                      type: "midi",
                      midi: event,
                      instrument: selectedInstrument,
                      user_id: user ? user.id : "0",
                    });
                  }}
                />
              </div>
            </Row>
          </Card>
          <Spacer y={0.5} />
          <Text small>
            Join our{" "}
            <Link href="https://discord.gg/upa4tP" icon color target="_blank">
              Discord
            </Link>
            community of musicians{" "}
          </Text>
          <Text small type="secondary">
            <Link href="https://github.com/fletcherist/jambox" target="_blank">
              v0.0.3
            </Link>{" "}
            <Link
              href="https://github.com/fletcherist/jambox/issues"
              icon
              color
              target="_blank"
            >
              report bug
            </Link>
          </Text>
          <Spacer y={2} />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Jambox />
    </StoreProvider>
  );
};

export default App;

const assert = (expression: boolean, error: string): void => {
  if (!expression) {
    throw new Error(error);
  }
};
const uniq = (list: string[]): string[] => {
  return Object.keys(
    list.reduce((counts, name) => {
      return { ...counts, ...{ [name]: 1 } };
    }, {} as { [key: string]: number })
  );
};
