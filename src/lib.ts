export interface TransportEvent {
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "error"
    | "user"
    | "user_join"
    | "user_leave"
    | "room"
    | "mute"
    | "unmute";

  user?: User;
  room?: Room;
}
export interface User {
  id: string;
  emoji: string;
}

export interface Room {
  users: User[];
}
