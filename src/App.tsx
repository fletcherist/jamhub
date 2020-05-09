import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";

import { User, Room } from "./lib";
import css from "./App.module.css";

import { Subject, of } from "rxjs";
import { mergeMap } from "rxjs/operators";
// import { TransportEvent } from "./lib.ts";

// import { Piano } from "@tonejs/piano";

// const piano = new Piano({
//   velocities: 5,
// });

//connect it to the speaker output
// piano.toDestination();
// piano.load().then(() => {
//   console.log("loaded!");
// });

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
  note: string;
}

interface Transport {
  send: (event: TransportEvent) => void;
  connect: () => { disconnect: () => void };
}

interface Player {
  send: (event: TransportEvent) => void;
}

const createPlayer = (): Player => {
  return {
    send: (event: TransportEvent) => {
      synth.triggerAttackRelease(`${event.note}`, "8n");
    },
  };
};

const createLocalTransport = ({ player }: { player: Player }): Transport => {
  const stream = new Subject<TransportEvent>();
  stream.subscribe((event) => player.send(event));
  return {
    send: (event: TransportEvent) => {
      stream.next(event);
    },
    connect: () => {
      return { disconnect: () => {} };
    },
  };
};
const createNetworkTransport = ({
  url,
  player,
}: {
  url: string;
  player: Player;
}): Transport => {
  const sendChannel = new Subject<TransportEvent>();
  const receiveChannel = new Subject<TransportEvent>();
  return {
    send: (event: TransportEvent) => {
      sendChannel.next(event);
    },
    connect: () => {
      const socket = new WebSocket(url);
      socket.onmessage = async (msg) => {
        const event = JSON.parse(msg.data) as TransportEvent;
        receiveChannel.next(event);
      };
      sendChannel
        .pipe(
          mergeMap(async (event) => {
            socket.send(JSON.stringify({ event }));
            return of(event);
          })
        )
        .subscribe();
      receiveChannel
        .pipe(
          mergeMap((event) => {
            player.send(event);
            return of(event);
          })
        )
        .subscribe();
      return {
        disconnect: () => {
          socket.close();
          sendChannel.unsubscribe();
          receiveChannel.unsubscribe();
        },
      };
    },
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
  const refSocket = useRef<WebSocket>();
  const player = createPlayer();
  const transport = createLocalTransport({ player });

  useEffect(() => {
    // refSocket.current = new WebSocket("ws://localhost:8080");
    refSocket.current = new WebSocket("ws://cap.chat:8080");
    return () => {
      refSocket.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!refSocket.current) {
      return;
    }
    const io = refSocket.current;
    io.onmessage = async (event) => {
      const msg = JSON.parse(event.data) as TransportEvent;
      console.log(msg);
      // piano.keyDown({ note: msg.note, velocity: 0.2 });
      // setTimeout(() => {
      //   piano.keyUp({ note: msg.note });
      // }, 1000);
      console.log(event);
    };
    io.onopen = () => {
      console.log("connect");
    };
  }, [refSocket]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // assert(keybardToNote.size === keybardToNote.size, 'error')
      const note = parseKeyboardKey(event.key, 4);
      if (!note) {
        return;
      }
      // piano.keyDown({ note: note, velocity: 0.2 });
      // setTimeout(() => {
      //   piano.keyUp({ note: note });
      // }, 100);
      transport.send({ note: note });
    };
    document.addEventListener("keydown", handleKeydown);
    (navigator as any).requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

    function getMIDIMessage(midiMessage: any) {
      console.log(midiMessage);
      const [type, pitch, velocity] = midiMessage.data;
      // note on
      if (type === 144) {
        synth.triggerAttackRelease(`C4`, "8n");
        // refSocket.current?.send(
        //   JSON.stringify({
        //     note: "C4",
        //   })
        // );
      }
    }
    function onMIDISuccess(midiAccess: any) {
      console.log(midiAccess);
      for (const midiInput of midiAccess.inputs.values()) {
        midiInput.onmidimessage = getMIDIMessage;
      }
    }

    function onMIDIFailure() {
      console.log("Could not access your MIDI devices.");
    }

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
    // if (typeof (navigator as any).requestMIDIAccess === "undefined") {
    //   alert("midi is not supported");
    //   return;
    // }
  }, [refSocket]);

  return (
    <div className={css.container}>
      <div
        style={{ width: 200, height: 300, backgroundColor: "blue" }}
        onClick={async () => {
          await Tone.start();
        }}
      >
        start
      </div>
    </div>
  );
};

export default App;
