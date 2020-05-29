import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";
import cx from "classnames";

import { Room } from "./lib";

import * as Lib from "./lib";

import { Subject, of, Observable } from "rxjs";
import { mergeMap, filter } from "rxjs/operators";
// import { LoggerEvent } from "./lib.ts";

import {
  MyKeyboard,
  UserKeyboard,
  UserKeyboardContainer,
  midiToNote,
} from "./Keyboard";

import { DX7, loadWAMProcessor, instruments, effects } from "./instruments";

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
  Button,
  User,
  Col,
  Radio,
  Snippet,
  Input,
} from "@zeit-ui/react";
import {
  createWebSocketTransport,
  createTransportRouter,
  Transport,
  TransportStatus,
} from "./transport";

import { startTransportSync } from "./Sandbox";

const audioContext = new AudioContext();
Tone.setContext(audioContext);

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
  const marimba = useRef<DX7>();
  const epiano = useRef<DX7>();

  const defaultLoadingStatus: LoadingStatus = {
    epiano: "not loaded",
    guitar: "not loaded",
    marimba: "not loaded",
    piano: "not loaded",
    sine: "ok",
    drums: "ok",
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
      dx7.connect(audioContext.destination);
      // dx7.co
      // Tone.connect(dx7 as AudioNode, effects.effectReverb);
      // dx7.connect(dx7.context.destination);
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
    const loadMarimba = async () => {
      try {
        updateIsLoaded({ marimba: "loading" });
        const dx7marimba = await loadDx7("MARIMBA   ");
        marimba.current = dx7marimba;
        updateIsLoaded({ marimba: "ok" });
      } catch (error) {
        console.error(error);
        updateIsLoaded({ marimba: "failed" });
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

    async function main() {
      try {
        await loadEpiano();
        await loadMarimba();
        await loadGuitar();
        await loadPiano();
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
        console.log("player", event, event.midi);
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
        } else if (event.instrument === "sine") {
          if (type === 144) {
            instruments.sine.triggerAttackRelease(midiToNote(pitch), "8n");
            return;
          }
          // else if (type === 128) {
          //   sine.triggerRelease(midiToNote(pitch));
          // }
        } else if (event.instrument === "drums") {
          if (type === 144) {
            instruments.drums.triggerAttackRelease(midiToNote(pitch), "8n");
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
  // const [usersPing, setUsersPing] = useState<{ [key: string]: number }>({});

  const store = useStore();
  const transport = webSocketTransport.current;

  const router = createTransportRouter(transport);
  // const transport = webSocketTransport;
  // const transport = createLocalTransport({ player });
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(
    "disconnected"
  );
  const [selectedInstrument, setSelectedInstrument] = useState<Lib.Instrument>(
    "sine"
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
      console.error("no midi inputs available");
      return;
    }
    const midiInput = midiInputs[0];
    if (!midiInput) {
      console.error(midiInputs, "no midi input", midiInput);
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
          // backgroundColor: "#37393f",
        }}
      >
        <Row
          style={{
            flexGrow: 2,
            maxWidth: 600,
          }}
        >
          <div style={{ flexGrow: 2, padding: "1rem" }}>
            <Radio.Group value="5" style={{ justifyContent: "center" }}>
              <Radio
                value="1"
                disabled={player.loadingStatus.piano === "loading"}
                onClick={() => setSelectedInstrument("piano")}
              >
                grand piano
                <Radio.Desc>
                  {player.loadingStatus.piano === "loading"
                    ? "loading..."
                    : "soft & ambient"}{" "}
                </Radio.Desc>
              </Radio>
              <Radio
                value="2"
                disabled={player.loadingStatus.guitar === "loading"}
                onClick={() => setSelectedInstrument("guitar")}
              >
                guitar<Radio.Desc>{player.loadingStatus.guitar}</Radio.Desc>
              </Radio>
              <Radio
                value="3"
                disabled={player.loadingStatus.marimba === "loading"}
                onClick={() => setSelectedInstrument("marimba")}
              >
                marimba<Radio.Desc>{player.loadingStatus.marimba}</Radio.Desc>
              </Radio>
              <Radio
                value="4"
                disabled={player.loadingStatus.epiano === "loading"}
                onClick={() => setSelectedInstrument("epiano")}
              >
                e-piano<Radio.Desc>{player.loadingStatus.epiano}</Radio.Desc>
              </Radio>
              <Radio
                value="5"
                disabled={player.loadingStatus.sine === "loading"}
                onClick={() => setSelectedInstrument("sine")}
              >
                sine<Radio.Desc>{player.loadingStatus.sine}</Radio.Desc>
              </Radio>
              <Radio
                value="6"
                disabled={player.loadingStatus.drums === "loading"}
                onClick={() => setSelectedInstrument("drums")}
              >
                drums<Radio.Desc>{player.loadingStatus.drums}</Radio.Desc>
              </Radio>
            </Radio.Group>
          </div>
          <div
            style={{
              display: "flex",
              // backgroundColor: "rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ padding: "1rem" }} className={css.users}>
              {store.state.room.users.map((roomUser) => {
                return (
                  <>
                    <div
                      style={{
                        backgroundColor: "white",
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        paddingTop: "1rem",
                        // background: "#40444b",
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
        <div>
          <Row>
            <div>
              <Row>
                <Text small>
                  {user && (
                    <span>
                      ping: <Ping userId={user.id} pingChannel={router.ping} />
                    </span>
                  )}
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
                    userId: user ? user.id : "0",
                  });
                }}
              />
            </div>
          </Row>
          <Spacer y={0.5} />
          <Text small>
            Join our{" "}
            <Link href="https://discord.gg/W9juhMx" icon color target="_blank">
              Discord
            </Link>
            community of musicians{" "}
          </Text>
          <Text small type="secondary">
            <Link href="https://github.com/fletcherist/jamhub" target="_blank">
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
          <Spacer y={2} />
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
