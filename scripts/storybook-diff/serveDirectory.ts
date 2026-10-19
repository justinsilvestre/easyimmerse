import { once } from "node:events";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".epub": "application/epub+zip",
};

export interface StaticServer {
  url: string;
  close(): Promise<void>;
}

/** Serves the files under `directory` on a free loopback port until closed. */
export async function serveDirectory(directory: string): Promise<StaticServer> {
  const server = createServer((request, response) => {
    respond(directory, request, response).catch(() => {
      response.writeHead(500).end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, close: () => close(server) };
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

async function respond(
  directory: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const path = resolveFilePath(directory, request.url ?? "/");
  const info = await stat(path).catch(() => null);
  if (info === null || !info.isFile()) {
    response.writeHead(404).end();
    return;
  }
  const range = parseByteRange(request.headers.range, info.size);
  response.writeHead(range ? 206 : 200, headersFor(path, info.size, range));
  createReadStream(path, range ?? {}).pipe(response);
}

/** Maps a request URL to a file under `directory`; the normalized absolute path cannot leave it. */
export function resolveFilePath(directory: string, url: string): string {
  const pathname = decodeURIComponent(
    new URL(url, "http://localhost").pathname,
  );
  const normalized = normalize(pathname);
  const relative = normalized.endsWith("/")
    ? `${normalized}index.html`
    : normalized;
  return join(directory, relative);
}

interface ByteRange {
  start: number;
  end: number;
}

/** Parses a `bytes=start-end` header into inclusive offsets within `size`, or null without one. */
export function parseByteRange(
  header: string | undefined,
  size: number,
): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "");
  if (!match || size === 0) return null;
  const [, from, to] = match;
  if (from === "")
    return { start: Math.max(0, size - Number(to)), end: size - 1 };
  const start = Number(from);
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  return start <= end ? { start, end } : null;
}

function headersFor(
  path: string,
  size: number,
  range: ByteRange | null,
): Record<string, string | number> {
  const contentType = contentTypes[extname(path)] ?? "application/octet-stream";
  const length = range ? range.end - range.start + 1 : size;
  const headers = {
    "Content-Type": contentType,
    "Content-Length": length,
    "Accept-Ranges": "bytes",
  };
  if (!range) return headers;
  return {
    ...headers,
    "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
  };
}
