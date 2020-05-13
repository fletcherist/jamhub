import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";
import cx from "classnames";

import {
  User,
  Room,
  pingEvent,
  TransportEvent,
  delay,
  Instrument,
} from "./lib";

import { Subject, of, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
// import { LoggerEvent } from "./lib.ts";

import { Piano } from "@tonejs/piano";
import { Reverb } from "tone";

import { Keyboard } from "./Keyboard";

import css from "./App.module.css";

const piano = new Piano({
  velocities: 5,
});

//connect it to the speaker output
const reverb = new Reverb({
  decay: 5,
  wet: 0.5,
});

piano.connect(reverb);
reverb.toDestination();

const synth = new Tone.Synth({
  oscillator: {
    type: "sine",
  },
  envelope: {
    attack: 0.005,
    decay: 0.1,
    sustain: 0.3,
    release: 1,
  },
}).toDestination();

export interface State {
  isMutedMicrophone: boolean;
  isMutedSpeaker: boolean;
  user?: User;
  room: Room;
}

interface Api {
  roomUserAdd: (user: User) => void;
  roomUserRemove: (user: User) => void;
  roomUserUpdate: (user: User) => void;
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

interface Transport {
  send: (event: TransportEvent) => void;
  connect: () => { disconnect: () => void };
  events: Observable<LoggerEvent>;
}

interface Player {
  send: (event: TransportEvent) => void;
}

const createPlayer = (): Player => {
  return {
    send: (event: TransportEvent) => {
      if (event.type === "midi") {
        console.log("player", event, event.midi);
        // synth.triggerAttackRelease("C4", "8n");
        // synth.triggerAttackRelease(event.note, "8n");
        const [type, pitch, velocity] = event.midi;

        if (event.instrument === "🎹") {
          if (type === 144) {
            piano.keyDown({ midi: pitch, velocity: velocity / 256 });
          } else if (type === 128) {
            piano.keyUp({ midi: pitch });
          }
        } else if (event.instrument === "🎻") {
          if (type === 144) {
            synth.triggerAttackRelease(
              Tone.Frequency(pitch, "midi").toNote(),
              "16n"
            );
          }
        }
      }
    },
  };
};

const createLocalTransport = ({ player }: { player: Player }): Transport => {
  const stream = new Subject<TransportEvent>();
  const events = new Subject<LoggerEvent>();
  stream.subscribe((event) => player.send(event));
  return {
    send: (event: TransportEvent) => {
      stream.next(event);
    },
    connect: () => {
      events.next({ type: "connectionStatus", status: "connected" });
      return {
        disconnect: () => {
          events.next({ type: "connectionStatus", status: "disconnected" });
        },
      };
    },
    events: events.asObservable(),
  };
};

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
          console.log("onmessage", event);
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
  };
};

const player = createPlayer();
const webSocketTransport = createWebSocketTransport({
  player,
  url: `wss://api.jambox.online${window.location.pathname}`,
  // url: "ws://84.201.149.157/123",
});

const App: React.FC = () => {
  // const transport = createLocalTransport({ player });
  const transport = webSocketTransport;
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(
    "disconnected"
  );
  const [pianoStatus, setPianoStatus] = useState<
    "not loaded" | "loading" | "ready"
  >("not loaded");
  const [ping, setPing] = useState<number>(0);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(
    "🎹"
  );

  useEffect(() => {
    setPianoStatus("loading");
    piano.load().then(() => {
      setPianoStatus("ready");
    });

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
    const handleMidiEvent = (midiEvent: Event & { data: MIDIEvent }) => {
      const [type, pitch, velocity] = midiEvent.data;
      console.log(midiEvent.data);

      if (type === 144) {
        // note on
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
        });
      } else if (type === 128) {
        // note off
        transport.send({
          type: "midi",
          midi: [type, pitch, velocity],
          instrument: selectedInstrument,
        });
      }
    };
    const tryAccessMidi = async (): Promise<void> => {
      try {
        if (typeof (navigator as any).requestMIDIAccess === "undefined") {
          throw new Error("midi is not supported");
        }
        const midiAccess = await (navigator as any).requestMIDIAccess();
        for (const midiInput of midiAccess.inputs.values()) {
          midiInput.onmidimessage = handleMidiEvent;
        }
      } catch (error) {
        console.error("Could not access your MIDI devices.", error);
      }
    };
    tryAccessMidi();
  });

  // useEffect(() => {
  //   setInterval(() => {
  //     console.log("tick");
  //     transport.send({ midi: [144, 108, 0.2] });
  //     transport.send({ midi: [128, 108, 0.2] });
  //     // 666.6666
  //   }, 666.6666);
  // }, []);

  const instruments: Instrument[] = [
    "🎹",
    "🎻",
    // "🎸", "🎤", "🎺", "🎧", "🥁", "🪕", "🎷"
  ];
  return (
    <div>
      {/* <h1>pick your instrument</h1> */}
      <div className={css.instruments}>
        {instruments.map((instrument) => {
          return (
            <div
              className={cx(css.instrument, {
                [css.instrumentActive]: selectedInstrument === instrument,
              })}
              onClick={() => {
                setSelectedInstrument(instrument);
              }}
            >
              {instrument}
            </div>
          );
        })}
      </div>

      <Keyboard
        onMIDIEvent={(event) => {
          console.log(event);
          transport.send({
            type: "midi",
            midi: event,
            instrument: selectedInstrument,
          });
        }}
      />
      <div>
        transport:{" "}
        <span
          style={{
            ...(transportStatus === "connected" && { color: "green" }),
            ...(transportStatus === "error" && { color: "red" }),
            // color: transportStatus === "connected" ? "green" : "black",
          }}
        >
          {transportStatus}
        </span>
      </div>
      <div>
        piano:{" "}
        <span
          style={{
            ...(pianoStatus === "ready" && { color: "green" }),
          }}
        >
          {pianoStatus}
        </span>
      </div>
      <div>ping: {ping}ms</div>
      <div>v0.0.3</div>
    </div>
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
