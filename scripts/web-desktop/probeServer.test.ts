import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";

import { probeServer } from "./probeServer.ts";

async function startServer(acceptedToken: string): Promise<Server> {
  const server = createServer((request, response) => {
    const accepted =
      request.headers.authorization === `Bearer ${acceptedToken}`;
    response.writeHead(accepted ? 200 : 401).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function urlOf(server: Server): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("probeServer", () => {
  it("reports a server that accepts the token as answering", async () => {
    const server = await startServer("t");
    const probe = await probeServer(urlOf(server), "t");
    server.close();
    assert.equal(probe, "answering");
  });

  it("reports a server that rejects the token as refusing", async () => {
    const server = await startServer("t");
    const probe = await probeServer(urlOf(server), "other");
    server.close();
    assert.equal(probe, "refusing");
  });

  it("reports a closed port as absent", async () => {
    const server = await startServer("t");
    const url = urlOf(server);
    await new Promise((resolve) => server.close(resolve));
    assert.equal(await probeServer(url, "t"), "absent");
  });
});
