import {
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
  WebSocketEvent,
  WebSocketMessage,
  WebSocket,
} from "https://deno.land/std/ws/mod.ts";
import { blue, green, red, yellow } from "https://deno.land/std/fmt/colors.ts";

import { server } from "./server.ts";
import { delay } from "https://deno.land/std/async/delay.ts";
import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts";
const port = 8080;
const endpoint = `ws://localhost:${port}`;

const createServer = () => server(port);
const connectServer = () => connectWebSocket(endpoint);

const queue = (
  sock: WebSocket
): {
  receive: () => Promise<WebSocketEvent>;
  request: (data: WebSocketMessage) => Promise<WebSocketEvent>;
} => {
  const listeners: Array<(event: WebSocketEvent) => void> = [];
  const listenSocket = async () => {
    for await (const msg of sock) {
      const listener = listeners.shift();
      if (listener) {
        listener(msg);
      }
      if (typeof msg === "string") {
        console.log(yellow(`< ${msg}`));
      } else if (isWebSocketPingEvent(msg)) {
        console.log(blue("< ping"));
      } else if (isWebSocketPongEvent(msg)) {
        console.log(blue("< pong"));
      } else if (isWebSocketCloseEvent(msg)) {
        console.log(red(`closed: code=${msg.code}, reason=${msg.reason}`));
      }
    }
    console.log("here");
  };

  listenSocket();

  const receive = (): Promise<WebSocketEvent> => {
    return new Promise((resolve) => {
      listeners.push((event) => {
        resolve(event);
      });
    });
  };
  const request = (data: WebSocketMessage): Promise<WebSocketEvent> => {
    return new Promise(async (resolve) => {
      receive().then(resolve);
      await sock.send(data);
    });
  };

  return {
    request,
    receive,
  };
};

const range = (start: number, end: number): number[] => {
  const res = [];
  for (let i = start; i <= end; i++) {
    res.push(i);
  }
  return res;
};

Deno.test({
  name: "1 connection",
  fn: async () => {
    const { listen, server } = createServer();
    listen();
    for (const _ of range(0, 1).reverse()) {
      const sock = await connectServer();
      const { request } = queue(sock);

      for (const iter of range(0, 10).reverse()) {
        const payload = "ping";
        const res = await request(payload);
        assertEquals(res, payload);
      }

      await sock.close();
    }
    await delay(1000);
    server.close();
  },
});
