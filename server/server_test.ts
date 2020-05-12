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

const createQueue = (
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
    }
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
    const server = createServer();
    server.run();
    for (const _ of range(0, 1).reverse()) {
      const sock = await connectServer();
      const queue = createQueue(sock);

      for (const iter of range(0, 10).reverse()) {
        const payload = "ping";
        const res = await queue.request(payload);
        assertEquals(res, payload);
      }

      await sock.close();
    }
    await delay(1000);
    server.close();
  },
});

Deno.test({
  name: "broadcast to many connections",
  fn: async () => {
    const server = createServer();
    server.run();
    const clients = await Promise.all(range(1, 100).map(() => connectServer()));
    const queues = clients.map(createQueue);

    const payload = "test";
    for (const client of clients) {
      const receivePromises = queues.map((queue) => queue.receive());
      receivePromises.forEach((promise) => {
        promise.then((res) => {
          assertEquals(res, payload);
        });
      });
      await client.send(payload);
      await delay(100);
      await client.close();
    }
    await delay(100);
    // await Promise.all(clients.map((client) => client.close()));
    await delay(100);
    server.close();
  },
});
