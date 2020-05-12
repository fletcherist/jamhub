import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket,
  WebSocketMessage,
} from "https://deno.land/std/ws/mod.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";
import { v4 as uuid } from "https://deno.land/std/uuid/mod.ts";

import { User, emojis, TransportEvent, pingEvent, delay } from "../src/lib.ts";
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
  console.log(
    blue(room.id),
    green(">"),
    `"${event}" to`,
    room.users.length,
    "users"
  );
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
      id: uuid.generate(),
    };

    const room = roomGetOrCreate(url);
    const roomId = room.id;

    const join = () => roomAddUser(roomId, user);
    const leave = () => roomRemoveUser(roomId, user);
    const log = (...args: unknown[]) => {
      console.log(blue(room.id), ...args);
    };

    join();
    log(green("user connected"), user.emoji, room.users.length);

    (async () => {
      try {
        while (true) {
          await delay(5000);
          await sock.ping();
        }
      } catch (error) {
        return;
      }
    })();

    try {
      for await (const ev of sock) {
        if (typeof ev === "string") {
          // text message
          log(red("<"), `"${ev}"`);
          const event = JSON.parse(ev) as TransportEvent;
          if (event.type === "midi") {
            roomBroadcast(room.id, ev);
          } else if (event.type === "ping") {
            await sock.send(JSON.stringify(pingEvent));
          }
        } else if (ev instanceof Uint8Array) {
          // binary message
          console.log("ws:Binary", ev);
        } else if (isWebSocketPingEvent(ev)) {
          const [, body] = ev;
          // ping
          console.log("ws:Ping", body);
          await sock.ping();
        } else if (isWebSocketCloseEvent(ev)) {
          // close
          const { code, reason } = ev;
          leave();
          log(red("user disconnected"));
          return;
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
  } catch (err) {
    console.error(`failed to accept websocket: ${err}`);
    await req.respond({ status: 400 });
  }
};

export const server = (
  port: number
): {
  close: () => void;
  run: () => Promise<void>;
} => {
  const addr: string = `:${port}`;
  const s = serve(addr);
  console.log(`websocket server is running on ${addr}`);
  const run = async (): Promise<void> => {
    for await (const req of s) {
      handle(req).catch(console.error);
    }
  };
  return { close: () => s.close(), run };
};
