export const APP_VERSION = "v1.0.0";

export type MIDIEvent = [number, number, number];

export type Instrument =
  | "piano"
  | "guitar"
  | "marimba"
  | "epiano"
  | "sine"
  | "drums"
  | "tinysynthStrings"
  | "tinysynthCreamyKeys";
export interface TransportEventPing {
  userId: string;
  type: "ping";
  value: number;
}
interface TransportEventPingOutgoing {
  type: "ping";
  value: number;
}
export interface TransportEventMIDI {
  type: "midi";
  midi: MIDIEvent;
  instrument: Instrument;
  userId: string;
}
export interface TransportEventRoom {
  type: "room";
  room: Room;
}
export interface TransportEventUser {
  type: "user";
  user: User;
}
export interface TransportEventUserJoin {
  type: "user_join";
  user: User;
}
export interface TransportEventUserLeave {
  type: "user_leave";
  user: User;
}
export type TransportEvent =
  | TransportEventMIDI
  | TransportEventPing
  | TransportEventRoom
  | TransportEventUser
  | TransportEventUserJoin
  | TransportEventUserLeave
  | TransportEventPingOutgoing;

export const createPingEvent = (): TransportEventPingOutgoing => {
  return { type: "ping", value: Date.now() };
};

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
