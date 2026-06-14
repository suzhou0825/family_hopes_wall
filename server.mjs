import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3333;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  handle(req, res);
}).listen(port, hostname, () => {
  console.log(`Ready on http://${hostname}:${port}`);
});
