import {
  createServer,
  type IncomingMessage,
  request,
  type Server,
  type ServerResponse,
} from "node:http";

/** Port 8789 is the standalone server's, so the forwarder takes the next one. */
export const lanForwarderPort = 8790;

/**
 * Starts a server on every network interface that passes each request on to the server at `upstreamUrl`.
 * The upstream server accepts only its own loopback Host header, so the forwarder rewrites that header.
 * Rejects when the port is taken.
 */
export async function startLanForwarder(
  upstreamUrl: string,
  port = lanForwarderPort,
): Promise<Server> {
  const upstream = new URL(upstreamUrl);
  const server = createServer((incoming, outgoing) =>
    forwardRequest(upstream, incoming, outgoing),
  );
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", resolve);
  });
  return server;
}

/** Streams the request body and the response through, so that Range requests and long media streams work. */
function forwardRequest(
  upstream: URL,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): void {
  const forwarded = request(
    {
      hostname: upstream.hostname,
      port: upstream.port,
      method: incoming.method,
      path: incoming.url,
      headers: { ...incoming.headers, host: upstream.host },
    },
    (answer) => {
      outgoing.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.on("error", () => outgoing.destroy());
      answer.pipe(outgoing);
    },
  );
  forwarded.on("error", () => answerUnreachable(upstream, outgoing));
  outgoing.on("close", () => forwarded.destroy());
  incoming.pipe(forwarded);
}

function answerUnreachable(upstream: URL, outgoing: ServerResponse): void {
  if (outgoing.headersSent) {
    outgoing.destroy();
    return;
  }
  outgoing
    .writeHead(502, { "content-type": "text/plain" })
    .end(`The server at ${upstream.origin} did not answer.`);
}
