import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
  WebSocketMessage,
} from "https://deno.land/std/ws/mod.ts";
// import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";

import { User, emojis } from "../src/lib.ts";

interface UserServer extends User {
  sock: WebSocket;
}
interface Room {
  users: UserServer[];
  id: string;
}
const roomsMap = new Map<string, Room>();
const createRoom = (id: string): Room => {
  return {
    users: [],
    id,
  };
};
const roomGetOrCreate = (id: string): Room => {
  const room = roomsMap.get(id);
  if (!room) {
    const newRoom = createRoom(id);
    roomsMap.set(id, newRoom);
    return newRoom;
  }
  return room;
};

const updateRoom = (id: string, room: Partial<Room>): void => {
  const roomPrev = roomGetOrCreate(id);
  const updated: Room = { ...roomPrev, ...room };
  roomsMap.set(id, updated);
};

const roomAddUser = (id: string, user: UserServer): void => {
  const room = roomGetOrCreate(id);
  return updateRoom(id, { users: [...room.users, user] });
};
const roomRemoveUser = (id: string, user: UserServer): void => {
  const room = roomGetOrCreate(id);
  return updateRoom(id, {
    users: room.users.filter((u) => u.id !== user.id),
  });
};
const roomBroadcast = (id: string, event: WebSocketMessage) => {
  const room = roomGetOrCreate(id);
  console.log("broadcasting to: ", room.users.length, "users");
  for (const user of room.users) {
    user.sock.send(event);
  }
};

const handle = async (req: ServerRequest) => {
  const { conn, r: bufReader, w: bufWriter, headers, url } = req;
  try {
    const sock = await acceptWebSocket({
      conn,
      bufReader,
      bufWriter,
      headers,
    });
    const user: UserServer = {
      sock: sock,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      id: `${Date.now()}${Math.floor(Math.random() * 1000000)}`,
    };

    const room = roomGetOrCreate(url);
    const roomId = room.id;

    const join = () => roomAddUser(roomId, user);
    const leave = () => roomRemoveUser(roomId, user);

    join();
    console.log("socket connected!", user.emoji, room.users.length);
    const listenEvents = async () => {
      try {
        for await (const ev of sock) {
          if (typeof ev === "string") {
            // text message
            console.log("ws:Text", ev);
            roomBroadcast(room.id, ev);
          } else if (ev instanceof Uint8Array) {
            // binary message
            console.log("ws:Binary", ev);
          } else if (isWebSocketPingEvent(ev)) {
            const [, body] = ev;
            // ping
            console.log("ws:Ping", body);
          } else if (isWebSocketCloseEvent(ev)) {
            // close
            const { code, reason } = ev;
            console.log("ws:Close", code, reason);
            leave();
            break;
          }
        }
      } catch (err) {
        console.error(
          `failed to receive frame: ${err}`,
          user.emoji,
          room.users.length
        );
        leave();
        if (!sock.isClosed) {
          await sock.close(1000).catch(console.error);
        }
      }
    };
    listenEvents();
  } catch (err) {
    console.error(`failed to accept websocket: ${err}`);
    await req.respond({ status: 400 });
  }
};

export const server = (
  port: number
): {
  close: () => void;
  listen: () => Promise<void>;
} => {
  const s = serve({ port });
  console.log(`websocket server is running on :${port}`);
  const listen = async (): Promise<void> => {
    for await (const req of s) {
      handle(req).catch(console.error);
    }
  };
  return { close: () => s.close(), listen };
};
