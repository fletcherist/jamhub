import React, { useState, useContext, useEffect, useRef } from "react";
import * as Tone from "tone";

import { User, Room } from "./lib";
import css from "./App.module.css";

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

const synth = new Tone.Synth().toMaster();

const assert = (expression: boolean, error: string): void => {
  if (!expression) {
    throw new Error(error);
  }
};

type KeyboardNote = "a" | "s" | "d" | "f" | "g" | "h" | "j";
type NotePitch = "C" | "D" | "E" | "F" | "G" | "A" | "B";
const keybardToNote = new Map<KeyboardNote, NotePitch>([
  ["a", "C"],
  ["s", "D"],
  ["d", "E"],
  ["f", "F"],
  ["g", "G"],
  ["h", "A"],
  ["j", "B"],
]);

const App: React.FC = () => {
  const refSocket = useRef<WebSocket>();
  useEffect(() => {
    refSocket.current = new WebSocket("ws://localhost:8080");
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
      const msg = JSON.parse(event.data) as { note: NotePitch };
      console.log(msg);
      await Tone.start();
      console.log("audio is ready");
      synth.triggerAttackRelease(`${msg.note}4`, "8n");
      console.log(event);
    };
    io.onopen = () => {
      console.log("connect");
    };
  }, [refSocket]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      console.log(keybardToNote.size);
      // assert(keybardToNote.size === keybardToNote.size, 'error')
      console.log(event);
      const note = keybardToNote.get(event.key as KeyboardNote);
      if (!note) {
        return;
      }
      refSocket.current?.send(
        JSON.stringify({
          note: note,
        })
      );
    };
    document.addEventListener("keydown", handleKeydown);
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
      <p></p>
    </div>
  );
};

export default App;
