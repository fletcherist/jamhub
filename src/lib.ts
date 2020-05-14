export type MIDIEvent = [number, number, number];

export type Instrument = "🎹" | "🎻";
interface TransportEventPing {
  type: "ping";
  // id: string;
}
interface TransportEventMIDI {
  type: "midi";
  midi: MIDIEvent;
  instrument: Instrument;
  user_id: string;
}
interface TransportEventRoom {
  type: "room";
  room: Room;
}
interface TransportEventUser {
  type: "user";
  user: User;
}
interface TransportEventUserJoin {
  type: "user_join";
  user: User;
}
interface TransportEventUserLeave {
  type: "user_leave";
  user: User;
}
export type TransportEvent =
  | TransportEventMIDI
  | TransportEventPing
  | TransportEventRoom
  | TransportEventUser
  | TransportEventUserJoin
  | TransportEventUserLeave;

export const pingEvent: TransportEventPing = { type: "ping" };

// export interface TransportEvent {
//   type:
//     | "midi"
//     | "ping"
//     | "pong"
//     | "answer"
//     | "candidate"
//     | "error"
//     | "user"
//     | "user_join"
//     | "user_leave"
//     | "room"
//     | "mute"
//     | "unmute";
//   midi?:
//   user?: User;
//   room?: Room;
// }
export interface User {
  id: string;
  emoji: string;
}

export interface Room {
  users: User[];
}

export const emojis = [
  "😎",
  "🧐",
  "🤡",
  "👻",
  "😷",
  "🤗",
  "😏",
  "👽",
  "👨‍🚀",
  "🐺",
  "🐯",
  "🦁",
  "🐶",
  "🐼",
  "🙈",
];

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
