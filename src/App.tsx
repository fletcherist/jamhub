import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";
import cx from "classnames";

import { Room } from "./lib";

import * as Lib from "./lib";

import { Subject, of, Observable } from "rxjs";
import { mergeMap, filter } from "rxjs/operators";

import { MyKeyboard, UserKeyboardContainer, midiToNote } from "./Keyboard";

import {
  DX7,
  loadWAMProcessor,
  instruments,
  effects,
  audioContext,
} from "./instruments";

import css from "./App.module.css";
import { Center, Instrument } from "./Components";
import {
  Row,
  Spacer,
  Text,
  Link,
  User,
  Tooltip,
  Divider,
} from "@zeit-ui/react";
import {
  createWebSocketTransport,
  createTransportRouter,
  Transport,
  TransportStatus,
} from "./transport";

import { startTransportSync } from "./Sandbox";

import * as WebAudioTinySynth from "webaudio-tinysynth";

const tinysynthPresets = {
  "acoustic-grand-piano": 0,
  marimba: 12,
  "drawbar-organ": 16,
  "rock-organ": 18,
  "reed-organ": 20,
  "acoustic-guitar": 24,
  "jazz-electrin-guitar": 26,
  "electric-bass": 34,
  "synth-strings": 51, // very good 80s sound
  voice: 54,
  ocarina: 79,
  "bowed-pad": 92,
  whistle: 78,
  bell: 112,
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

type LoadingStatus = {
  [key in Lib.Instrument]: "not loaded" | "loading" | "failed" | "ok";
};
interface Player {
  send: (event: Lib.TransportEvent) => void;
  loadingStatus: LoadingStatus;
}

const usePlayer = (): Player => {
  const guitar1 = useRef<DX7>();
  const epiano = useRef<DX7>();
  const tinysynthStrings = useRef<any>();
  const tinysynthCreamyKeys = useRef<any>();

  const defaultLoadingStatus: LoadingStatus = {
    epiano: "not loaded",
    guitar: "not loaded",
    piano: "not loaded",
    sine: "ok",
    drums: "ok",
    tinysynthStrings: "not loaded",
    tinysynthCreamyKeys: "not loaded",
    kalimba: "ok",
    river: "ok",
  };
  const refLoadingStatus = useRef<LoadingStatus>(defaultLoadingStatus);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>(
    defaultLoadingStatus
  );
  const updateIsLoaded = (partial: Partial<LoadingStatus>) => {
    const newLoadingStatus: LoadingStatus = {
      ...refLoadingStatus.current,
      ...partial,
    };
    setLoadingStatus(newLoadingStatus);
    refLoadingStatus.current = newLoadingStatus;
  };

  type Preset = "BRASS   1 " | "GUITAR  1 " | "MARIMBA   " | "E.PIANO 1 ";

  useEffect(() => {
    const loadDx7 = async (preset: Preset): Promise<DX7> => {
      await loadWAMProcessor(audioContext);
      await DX7.importScripts(audioContext);
      const dx7 = new DX7(audioContext);

      const dx7gain = audioContext.createGain();
      dx7gain.connect(audioContext.destination);
      dx7gain.gain.value = 0.4;
      dx7.connect(dx7gain);
      // Tone.connect(dx7 as AudioNode, effects.effectReverb);
      await dx7.loadBank("rom1A.syx");
      // const presetNames = [...dx7.presets.keys()];
      // console.log("presetNames", presetNames);
      dx7.setPatch(dx7.presets.get(preset));
      return dx7;
    };
    const loadEpiano = async () => {
      try {
        updateIsLoaded({ epiano: "loading" });
        const dx7epiano = await loadDx7("E.PIANO 1 ");
        epiano.current = dx7epiano;
        updateIsLoaded({ epiano: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ epiano: "failed" });
      }
    };
    const loadGuitar = async () => {
      try {
        updateIsLoaded({ guitar: "loading" });
        const dx7guitar1 = await loadDx7("GUITAR  1 ");
        guitar1.current = dx7guitar1;
        updateIsLoaded({ guitar: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ guitar: "failed" });
      }
    };
    const loadPiano = async () => {
      try {
        updateIsLoaded({ piano: "loading" });
        await instruments.piano.load();
        updateIsLoaded({ piano: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ piano: "failed" });
      }
    };
    const loadTinysynthStrings = async () => {
      try {
        updateIsLoaded({ tinysynthStrings: "loading" });
        const synth = new WebAudioTinySynth({
          quality: 1,
          useReverb: 1,
          reverbLev: 1,
        });
        synth.send([0xc0, tinysynthPresets["synth-strings"]]);
        console.log("synth", synth);

        tinysynthStrings.current = synth;
        updateIsLoaded({ tinysynthStrings: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ tinysynthStrings: "failed" });
      }
    };
    const loadTinysynthCreamyKeys = async () => {
      try {
        updateIsLoaded({ tinysynthCreamyKeys: "loading" });
        const synth = new WebAudioTinySynth({
          quality: 1,
          useReverb: 1,
          // reverbLev: 5,
        });
        // synth.setReverbLev(1);
        synth.send([0xc0, tinysynthPresets["acoustic-grand-piano"]]);
        tinysynthCreamyKeys.current = synth;
        updateIsLoaded({ tinysynthCreamyKeys: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ tinysynthCreamyKeys: "failed" });
      }
    };

    async function main() {
      try {
        await Promise.all([
          loadEpiano(),
          loadGuitar(),
          loadPiano(),
          loadTinysynthStrings(),
          loadTinysynthCreamyKeys(),
        ]);
        // await loadMarimba();
        // await loadGuitar();
        // await loadPiano();
      } catch (error) {
        console.error(error);
      }
    }
    main();
  }, []);

  return {
    loadingStatus,
    send: (event: Lib.TransportEvent) => {
      if (event.type === "midi") {
        // console.log("player", event, event.midi);
        // synth.triggerAttackRelease("C4", "8n");
        // synth.triggerAttackRelease(event.note, "8n");
        const [type, pitch, velocity] = event.midi;

        if (event.instrument === "piano") {
          if (type === 144) {
            instruments.piano.keyDown({
              midi: pitch,
              velocity: velocity / 256,
            });
          } else if (type === 128) {
            instruments.piano.keyUp({ midi: pitch });
          }
        } else if (event.instrument === "guitar") {
          if (!guitar1.current) {
            console.error("dx7 guitar1 is not loaded");
            return;
          }
          guitar1.current.onMidi(event.midi);
        } else if (event.instrument === "epiano") {
          if (!epiano.current) {
            console.error("dx7 epiano is not loaded");
            return;
          }
          epiano.current.onMidi(event.midi);
        } else if (event.instrument === "tinysynthStrings") {
          if (!tinysynthStrings.current) {
            console.error("tinysynthStrings is not loaded");
            return;
          }
          tinysynthStrings.current.send(event.midi);
          return;
        } else if (event.instrument === "tinysynthCreamyKeys") {
          if (!tinysynthCreamyKeys.current) {
            console.error("tinysynthCreamyKeys is not loaded");
            return;
          }
          tinysynthCreamyKeys.current.send(event.midi);
          return;
        } else if (event.instrument === "drums") {
          if (type === 144) {
            instruments.drums.triggerAttackRelease(midiToNote(pitch), "8n");
          }
        } else if (event.instrument === "kalimba") {
          if (type === 144) {
            instruments.kalimba.triggerAttackRelease(midiToNote(pitch), "1n");
          }
        } else if (event.instrument === "river") {
          if (type === 144) {
            instruments.river.triggerAttackRelease(midiToNote(pitch), "1n");
          }
        } else {
          console.error("instrument not implemented", event.instrument);
        }
      }
    },
  };
};

// https://tonejs.github.io/examples/quantization.html

const Ping: React.FC<{
  userId: string;
  pingChannel: Observable<Lib.TransportEventPing>;
}> = ({ userId, pingChannel }) => {
  const [ping, setPing] = useState<number>(0);
  useEffect(() => {
    const subscription = pingChannel.subscribe((pingEvent) => {
      if (pingEvent.userId === userId) {
        setPing(pingEvent.value);
      }
    });
    return () => subscription.unsubscribe();
  }, [pingChannel, userId]);
  // useEffect(() => {
  //   const subscription = router.ping.subscribe((pingEvent) => {
  //     setUsersPing({
  //       ...usersPing,
  //       ...{ [pingEvent.userId]: pingEvent.value },
  //     });
  //   });
  //   return () => subscription.unsubscribe();
  // }, [router, usersPing]);

  return <span>{ping}ms</span>;
};

const Jamhub: React.FC = () => {
  const player = usePlayer();

  const webSocketTransport = useRef<Transport>(
    createWebSocketTransport({
      url: `wss://ru1.jamhub.io${window.location.pathname}`,
    })
  );
  // const localTransport = useRef<Transport>(
  //   createLocalTransport({ player })
  // );

  const store = useStore();
  const transport = webSocketTransport.current;
  const router = createTransportRouter(transport);
  // const transport = createLocalTransport({ player });
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(
    "disconnected"
  );
  const [selectedInstrument, setSelectedInstrument] = useState<Lib.Instrument>(
    "tinysynthCreamyKeys"
  );
  const [user, setUser] = useState<Lib.User>();
  const [midiAccess, setMidiAccess] = useState<any | undefined>(undefined);

  useEffect(() => {
    const listener = transport.receive.subscribe((event) => {
      if (event.type === "midi") {
        player.send(event);
      } else if (event.type === "ping") {
        // console.log(event.type);
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
  }, [store, player, transport]);
  useEffect(() => {
    const listener = transport.events
      .pipe(
        mergeMap((event) => {
          console.log(event);
          if (event.type === "connectionStatus") {
            setTransportStatus(event.status);
          }
          return of(event);
        })
      )
      .subscribe();
    return () => {
      listener.unsubscribe();
    };
  }, [transport.events]);

  useEffect(() => {
    const conn = transport.connect();
    return () => {
      conn.disconnect();
    };
  }, [transport]);

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
      console.log("no midi inputs available");
      return;
    }
    const midiInput = midiInputs[0];
    if (!midiInput) {
      console.log(midiInputs, "no midi input", midiInput);
      return;
    }

    const handleMidiEvent = (midiEvent: Event & { data: Lib.MIDIEvent }) => {
      const [type, pitch, velocity] = midiEvent.data;
      console.log("handleMidiEvent", midiEvent.data);
      if (type === 144) {
        // note on
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
          userId: user.id,
        });
      } else if (type === 128) {
        // note off
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
          userId: user.id,
        });
      }
    };

    midiInput.addEventListener("midimessage", handleMidiEvent);
    return () => {
      midiInput.removeEventListener("midimessage", handleMidiEvent);
    };
  }, [midiAccess, user, selectedInstrument, transport]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          height: "100%",
          paddingTop: "1rem",
          paddingBottom: "1rem",
          // backgroundColor: "#37393f",
        }}
      >
        <Row
          style={{
            flexGrow: 2,
            maxWidth: 500,
          }}
        >
          <div
            style={{
              flexGrow: 2,
              // padding: "1rem"
            }}
          >
            <Instrument
              name="grand piano"
              onClick={() => setSelectedInstrument("piano")}
              loading={player.loadingStatus.piano === "loading"}
              selected={selectedInstrument === "piano"}
              description="soft & ambient"
            />
            <Instrument
              name="guitar"
              onClick={() => setSelectedInstrument("guitar")}
              loading={player.loadingStatus.guitar === "loading"}
              selected={selectedInstrument === "guitar"}
              description="for solos"
            />
            <Instrument
              name="electronic piano"
              onClick={() => setSelectedInstrument("epiano")}
              loading={player.loadingStatus.epiano === "loading"}
              selected={selectedInstrument === "epiano"}
              description="jazzy"
            />
            <Instrument
              name="kalimba"
              onClick={() => setSelectedInstrument("kalimba")}
              loading={player.loadingStatus.kalimba === "loading"}
              selected={selectedInstrument === "kalimba"}
              description="percussion"
            />
            <Instrument
              name="80s strings"
              onClick={() => setSelectedInstrument("tinysynthStrings")}
              loading={player.loadingStatus.tinysynthStrings === "loading"}
              selected={selectedInstrument === "tinysynthStrings"}
              description="example sound"
            />
            <Instrument
              name="creamy keys"
              onClick={() => setSelectedInstrument("tinysynthCreamyKeys")}
              loading={player.loadingStatus.tinysynthCreamyKeys === "loading"}
              selected={selectedInstrument === "tinysynthCreamyKeys"}
              description="good vibes only"
            />
            <Instrument
              name="lo-fi drums"
              onClick={() => setSelectedInstrument("drums")}
              loading={player.loadingStatus.drums === "loading"}
              selected={selectedInstrument === "drums"}
              description="for chilling"
            />
            <Instrument
              name="river"
              onClick={() => setSelectedInstrument("river")}
              loading={player.loadingStatus.river === "loading"}
              selected={selectedInstrument === "river"}
              description="playtronica soundfont"
            />
          </div>
          <div
            style={{
              display: "flex",
              // backgroundColor: "rgba(0,0,0,0.05)",
            }}
          >
            <div className={css.users}>
              {store.state.room.users.map((roomUser) => {
                return (
                  <>
                    <div
                      style={{
                        backgroundColor: "white",
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        paddingTop: "1rem",
                      }}
                    >
                      <User
                        src="https://unix.bio/assets/avatar.png"
                        name="Witt"
                      >
                        ping:{" "}
                        <Ping userId={roomUser.id} pingChannel={router.ping} />
                      </User>
                      <UserKeyboardContainer
                        transport={transport}
                        userId={roomUser.id}
                      />
                    </div>
                    <Spacer y={0.5} />
                  </>
                );
              })}
            </div>
          </div>
        </Row>
      </div>
      <div className={css.myKeyboard}>
        <div style={{ minWidth: 500 }}>
          <Row>
            <div>
              <MyKeyboard
                onMIDIEvent={(event) => {
                  // console.log("onMIDIEvent", event);
                  if (!user) {
                    console.error("no user");
                  }
                  transport.send({
                    type: "midi",
                    midi: event,
                    instrument: selectedInstrument,
                    userId: user ? user.id : "0",
                  });
                }}
              />
            </div>
          </Row>
          <Spacer y={0.5} />
          {/* <Text h2>hints</Text> */}
          <Text small>
            <ul>
              <li>
                use keyboard to play,{" "}
                <Tooltip text={"octave down"}>
                  <Text b style={{ cursor: "pointer" }}>
                    z
                  </Text>
                </Tooltip>{" "}
                <Tooltip text={"octave up"}>
                  <Text b style={{ cursor: "pointer" }}>
                    x
                  </Text>
                </Tooltip>{" "}
                <Tooltip text={"less velocity"}>
                  <Text b style={{ cursor: "pointer" }}>
                    c
                  </Text>
                </Tooltip>{" "}
                <Tooltip text={"more velocity"}>
                  <Text b style={{ cursor: "pointer" }}>
                    v
                  </Text>
                </Tooltip>{" "}
                for performance settings
              </li>
              <li>attach midi</li>
              <li>
                your ping is{" "}
                {user && <Ping userId={user.id} pingChannel={router.ping} />}
                {!user && "connecting..."},{" "}
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
              </li>
              <li>
                join our{" "}
                <Link
                  href="https://discord.gg/W9juhMx"
                  icon
                  color
                  target="_blank"
                >
                  discord
                </Link>
                community of musicians{" "}
              </li>
            </ul>
            <Divider />
            <Text type="secondary">
              <Link
                href="https://github.com/fletcherist/jamhub"
                target="_blank"
              >
                {Lib.APP_VERSION}
              </Link>{" "}
              <Link
                href="https://github.com/fletcherist/jamhub/issues"
                icon
                color
                target="_blank"
              >
                report bug
              </Link>
            </Text>
          </Text>
          {/* <div>
              <Tooltip text={"less velocity"}>
                <KeyboardDescription>c</KeyboardDescription>
              </Tooltip>
              <Tooltip text={"more velocity"}>
                <KeyboardDescription>v</KeyboardDescription>
              </Tooltip>
            </div> */}
          {/* <Spacer y={2} /> */}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <Jamhub />
    </StoreProvider>
  );
};

export default App;

// const assert = (expression: boolean, error: string): void => {
//   if (!expression) {
//     throw new Error(error);
//   }
// };
// const uniq = (list: string[]): string[] => {
//   return Object.keys(
//     list.reduce((counts, name) => {
//       return { ...counts, ...{ [name]: 1 } };
//     }, {} as { [key: string]: number })
//   );
// };
