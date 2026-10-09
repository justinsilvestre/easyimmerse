import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";

import { startLanForwarder } from "./lanForwarder.ts";

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

async function startUpstream(handler: Handler): Promise<Server> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function urlOf(server: Server): string {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

/** Sends one request through a forwarder to the upstream, then closes both. */
async function forward(
  upstream: Server,
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  const forwarder = await startLanForwarder(urlOf(upstream), 0);
  const response = await fetch(new URL(path, urlOf(forwarder)), { headers });
  await response.arrayBuffer().catch(() => undefined);
  forwarder.close();
  upstream.close();
  return response;
}

/** Starts an upstream that answers with the value `pick` reads from each request. */
function echoing(pick: (request: IncomingMessage) => string): Promise<Server> {
  return startUpstream((request, response) => {
    response.setHeader("x-echo", pick(request));
    response.end();
  });
}

describe("startLanForwarder", () => {
  it("rewrites the Host header to the upstream's host", async () => {
    const upstream = await echoing((request) => request.headers.host ?? "");
    const upstreamHost = new URL(urlOf(upstream)).host;
    const response = await forward(upstream, "/projects");
    assert.equal(response.headers.get("x-echo"), upstreamHost);
  });

  it("preserves the path and query", async () => {
    const upstream = await echoing((request) => request.url ?? "");
    const response = await forward(upstream, "/media/1?token=abc");
    assert.equal(response.headers.get("x-echo"), "/media/1?token=abc");
  });

  it("passes a Range header to the upstream", async () => {
    const upstream = await echoing((request) => request.headers.range ?? "");
    const response = await forward(upstream, "/media/1", {
      Range: "bytes=0-99",
    });
    assert.equal(response.headers.get("x-echo"), "bytes=0-99");
  });

  it("returns the upstream's status", async () => {
    const upstream = await startUpstream((_request, response) => {
      response.writeHead(206).end("partial");
    });
    const response = await forward(upstream, "/media/1");
    assert.equal(response.status, 206);
  });

  it("returns the upstream's body", async () => {
    const upstream = await startUpstream((_request, response) => {
      response.end("partial");
    });
    const forwarder = await startLanForwarder(urlOf(upstream), 0);
    const response = await fetch(new URL("/media/1", urlOf(forwarder)));
    const body = await response.text();
    forwarder.close();
    upstream.close();
    assert.equal(body, "partial");
  });

  it("answers 502 when the upstream is unreachable", async () => {
    const upstream = await startUpstream(() => undefined);
    const url = urlOf(upstream);
    await new Promise((resolve) => upstream.close(resolve));
    const forwarder = await startLanForwarder(url, 0);
    const response = await fetch(new URL("/projects", urlOf(forwarder)));
    await response.arrayBuffer();
    forwarder.close();
    assert.equal(response.status, 502);
  });
});
