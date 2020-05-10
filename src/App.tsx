import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";

import { User, Room } from "./lib";
import css from "./App.module.css";

import { Subject, of, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
// import { TransportEvent } from "./lib.ts";

import { Piano } from "@tonejs/piano";
import { Reverb } from "tone";

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
// const synth = new Tone.MetalSynth().toMaster();
// const synth = new Tone.MetalSynth().toMaster();

const assert = (expression: boolean, error: string): void => {
  if (!expression) {
    throw new Error(error);
  }
};

type KeyboardNoteKey =
  | "a"
  | "s"
  | "d"
  | "f"
  | "g"
  | "h"
  | "j"
  | "k"
  | "l"
  | "w"
  | "e"
  | "t"
  | "y"
  | "u"
  | "o";
type KeboardNote =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";
type KeyboardNotePitch = KeboardNote | "C8" | "C#8" | "D8";
const keybardToNoteMap = new Map<KeyboardNoteKey, KeyboardNotePitch>([
  ["a", "C"],
  ["w", "C#"],
  ["s", "D"],
  ["e", "D#"],
  ["d", "E"],
  ["f", "F"],
  ["t", "F#"],
  ["g", "G"],
  ["y", "G#"],
  ["h", "A"],
  ["u", "A#"],
  ["j", "B"],
  ["k", "C8"], // 1 octave higher than C
  ["o", "C#8"], // 1 octave higher than C#
  ["l", "D8"], // 1 octave higher than D
]);

interface TransportEvent {
  // note: string;
  midi: [number, number, number];
}

type TransportStatus = "disconnected" | "connecting" | "connected";
interface Transport {
  send: (event: TransportEvent) => void;
  connect: () => { disconnect: () => void };
  events: Observable<TransportStatus>;
}

interface Player {
  send: (event: TransportEvent) => void;
}

const createPlayer = (): Player => {
  return {
    send: (event: TransportEvent) => {
      console.log("player", event, event.midi);
      // synth.triggerAttackRelease("C4", "8n");
      // synth.triggerAttackRelease(event.note, "8n");
      const [type, pitch, velocity] = event.midi;
      if (type === 144) {
        piano.keyDown({ midi: pitch, velocity: velocity / 256 });
      } else if (type === 128) {
        piano.keyUp({ midi: pitch });
      }
    },
  };
};

const createLocalTransport = ({ player }: { player: Player }): Transport => {
  const stream = new Subject<TransportEvent>();
  const events = new Subject<TransportStatus>();
  stream.subscribe((event) => player.send(event));
  return {
    send: (event: TransportEvent) => {
      stream.next(event);
    },
    connect: () => {
      events.next("connected");
      return {
        disconnect: () => {
          events.next("disconnected");
        },
      };
    },
    events: events.asObservable(),
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
  const events = new Subject<TransportStatus>();
  return {
    send: (event: TransportEvent) => {
      send.next(event);
    },
    connect: () => {
      events.next("connecting");
      const socket = new WebSocket(url);
      // send/receieve data pipelines
      const sendPipeline = send.pipe(
        mergeMap(async (event) => {
          socket.send(JSON.stringify(event));
          return of(event);
        })
      );
      const receivePipeline = receive.pipe(
        mergeMap((event) => {
          player.send(event);
          return of(event);
        })
      );

      socket.onopen = () => {
        sendPipeline.subscribe();
        receivePipeline.subscribe();
        events.next("connected");
      };
      socket.onclose = () => {
        events.next("disconnected");
      };
      socket.onmessage = async (msg) => {
        const event = JSON.parse(msg.data) as TransportEvent;
        console.log("onmessage", event);
        receive.next(event);
      };
      return {
        disconnect: () => {
          socket.close();
          send.complete();
          receive.complete();
        },
      };
    },
    events: events.asObservable(),
  };
};

const selectKeyboardKeyOctave = (
  key: KeyboardNotePitch,
  octave: number
): number => octave + (key.endsWith("8") ? 1 : 0);
const parseKeyboardKey = (key: string, octave: number): string | undefined => {
  try {
    return mapKeyboardKeyToNote(key as KeyboardNoteKey, octave);
  } catch (error) {
    return undefined;
  }
};
const mapKeyboardKeyToNote = (key: KeyboardNoteKey, octave: number): string => {
  const note = keybardToNoteMap.get(key);
  if (!note) {
    throw new Error("invalid key");
  }
  return `${note.replace("8", "")}${selectKeyboardKeyOctave(note, octave)}`;
};

const App: React.FC = () => {
  const player = createPlayer();
  // const transport = createLocalTransport({ player });
  const transport = createWebSocketTransport({
    player,
    // url: `wss://api.jambox.online${window.location.pathname}`,
    url: "ws://localhost:8080/123",
  });
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(
    "disconnected"
  );
  const [pianoStatus, setPianoStatus] = useState<
    "not loaded" | "loading" | "ready"
  >("not loaded");

  useEffect(() => {
    setPianoStatus("loading");
    piano.load().then(() => {
      setPianoStatus("ready");
      console.log("loaded!");
    });

    const listener = transport.events
      .pipe(
        mergeMap((event) => {
          console.log(event);
          setTransportStatus(event);
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
    const handleKeydown = (event: KeyboardEvent) => {
      // console.log(event);
      const note = parseKeyboardKey(event.key, 4);
      if (!note) {
        return;
      }
      const pitch = Tone.Frequency(note).toMidi();
      transport.send({ midi: [144, pitch, 30] });
      setTimeout(() => {
        transport.send({ midi: [128, pitch, 64] });
      }, 500);
    };
    const handleMidiEvent = (
      midiEvent: Event & { data: [number, number, number] }
    ) => {
      const [type, pitch, velocity] = midiEvent.data;
      console.log(midiEvent.data);

      if (type === 144) {
        // note on
        transport.send({ midi: [type, pitch, velocity] });
      } else if (type === 128) {
        // note off
        transport.send({ midi: [type, pitch, velocity] });
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
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  return (
    <div className={css.container}>
      <button
        style={{ width: 200, height: 300, backgroundColor: "blue" }}
        onClick={async () => {
          await Tone.start();
        }}
      >
        start
      </button>
      <div>transport: {transportStatus}</div>
      <div>piano: {pianoStatus}</div>
    </div>
  );
};

export default App;
