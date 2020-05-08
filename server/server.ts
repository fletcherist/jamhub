import { serve } from "https://deno.land/std@v1.0.0-rc1/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
  WebSocketMessage,
} from "https://deno.land/std@v1.0.0-rc1/ws/mod.ts";

import { User, emojis } from "../src/lib.ts";

const port = Deno.args[0] || "8080";

interface UserServer extends User {
  sock: WebSocket;
}
interface Room {
  users: UserServer[];
}
const roomsMap = new Map<string, Room>();
const createRoom = (id: string): Room => {
  return {
    users: [],
  };
};
const getOrCreateRoom = (id: string): Room => {
  const room = roomsMap.get(id);
  if (!room) {
    const newRoom = createRoom(id);
    roomsMap.set(id, newRoom);
    return newRoom;
  }
  return room;
};
const roomAddUser = (room: Room, user: UserServer): void => {
  room.users = [...room.users, user];
};
const roomRemoveUser = (room: Room, user: UserServer): void => {
  room.users = room.users.filter((u) => u.id !== user.id);
};
const roomBroadcast = (room: Room, event: WebSocketMessage) => {
  for (const user of room.users) {
    user.sock.send(event);
  }
};
console.log(`websocket server is running on :${port}`);
for await (const req of serve(`:${port}`)) {
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
      id: String(Date.now()),
    };
    const room = getOrCreateRoom(url);
    roomAddUser(room, user);
    console.log("socket connected!");
    const listenEvents = async () => {
      try {
        for await (const ev of sock) {
          if (typeof ev === "string") {
            // text message
            console.log("ws:Text", ev);
            roomBroadcast(room, ev);
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
          }
        }
      } catch (err) {
        console.error(`failed to receive frame: ${err}`);
        roomRemoveUser(room, user);
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
}
