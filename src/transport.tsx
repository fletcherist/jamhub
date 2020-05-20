import { TransportEvent, delay, createPingEvent } from "./lib";
import * as Lib from "./lib";
import { Observable, Subject, of } from "rxjs";
import { mergeMap, filter } from "rxjs/operators";

// based on sockette https://github.com/lukeed/sockette
const webSocketReconnect = (
  url: string,
  {
    onopen,
    onerror,
    onclose,
    onmessage,
  }: {
    onopen: (ev: Event) => void;
    onerror: (ev: Event) => void;
    onclose: (ev: CloseEvent) => void;
    onmessage: (ev: MessageEvent) => void;
  }
) => {
  let sock: WebSocket;
  const open = (): void => {
    sock = new WebSocket(url);
    sock.onmessage = onmessage;
    sock.onopen = (event) => onopen(event);
    sock.onclose = async (event) => {
      await delay(1000);
      reconnect();
      onclose(event);
    };
    sock.onerror = (error) => {
      onerror(error);
      sock.close();
    };
  };

  const close = (): void => sock.close();
  const reconnect = () => open();
  const send = (
    data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView
  ): void => sock.send(data);

  open();
  return {
    open,
    close,
    reconnect,
    send,
  };
};

interface LoggerEventConnectionStatus {
  type: "connectionStatus";
  status: TransportStatus;
}

type LoggerEvent = LoggerEventConnectionStatus;
export type TransportStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface Transport {
  send: (event: TransportEvent) => void;
  connect: () => { disconnect: () => void };
  events: Observable<LoggerEvent>;
  receive: Observable<TransportEvent>;
}

export const createLocalTransport = (): Transport => {
  const send = new Subject<TransportEvent>();
  const receive = new Subject<TransportEvent>();
  const events = new Subject<LoggerEvent>();
  return {
    send: (event: TransportEvent) => {
      send.next(event);
    },
    connect: () => {
      const subscription = send.subscribe((event) => {
        receive.next(event);
      });
      events.next({ type: "connectionStatus", status: "connected" });
      return {
        disconnect: () => {
          subscription.unsubscribe();
          events.next({ type: "connectionStatus", status: "disconnected" });
        },
      };
    },
    events: events.asObservable(),
    receive: receive.asObservable(),
  };
};

export const createWebSocketTransport = ({
  url,
}: {
  url: string;
}): Transport => {
  const send = new Subject<TransportEvent>();
  const receive = new Subject<TransportEvent>();
  const events = new Subject<LoggerEvent>();
  return {
    send: (event: TransportEvent) => {
      send.next(event);
    },
    connect: () => {
      events.next({ type: "connectionStatus", status: "connecting" });
      const sock = webSocketReconnect(url, {
        onclose: (event) => {
          console.log(event);
          events.next({ type: "connectionStatus", status: "disconnected" });
        },
        onerror: (event) => {
          console.error(event);
          events.next({ type: "connectionStatus", status: "error" });
        },
        onopen: (event) => {
          console.log(event);
          events.next({ type: "connectionStatus", status: "connected" });

          sendPipeline.subscribe();
          receivePipeline.subscribe();
        },
        onmessage: (msg) => {
          const event = JSON.parse(msg.data) as TransportEvent;
          // console.log("onmessage", event);
          receive.next(event);
        },
      });

      // send/receieve data pipelines
      const sendPipeline = send.pipe(
        mergeMap((event) => {
          sock.send(JSON.stringify(event));
          return of(event);
        })
      );
      const receivePipeline = receive.pipe(
        mergeMap((event) => {
          return of(event);
        })
      );

      (async () => {
        while (true) {
          await delay(5000);
          send.next(createPingEvent());
        }
      })();

      return {
        disconnect: () => {
          send.complete();
          receive.complete();
          sock.close();
        },
      };
    },
    events: events.asObservable(),
    receive: receive.asObservable(),
  };
};

export const createTransportRouter = (transport: Transport) => {
  const ping = transport.receive.pipe(
    filter((event) => event.type === "ping")
  ) as Observable<Lib.TransportEventPing>;

  return { ping };
};
