import { server } from "./server.ts";

const port: number = Number(Deno.args[0]) || 8080;
await server(port).run();
