import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  parseFreshServerFile,
  waitForDesktopServer,
} from "./waitForDesktopServer.ts";

const fileText = (token: string) =>
  `EASYIMMERSE_DESKTOP_SERVER_URL='http://127.0.0.1:8787'\nEASYIMMERSE_DESKTOP_TOKEN='${token}'\n`;

describe("parseFreshServerFile", () => {
  it("reads a file that changed", () => {
    const file = parseFreshServerFile(fileText("old"), fileText("new"));
    assert.equal(file?.token, "new");
  });

  it("ignores a file that did not change", () => {
    assert.equal(parseFreshServerFile(fileText("old"), fileText("old")), null);
  });

  it("ignores a missing file", () => {
    assert.equal(parseFreshServerFile(fileText("old"), null), null);
  });

  it("reads a file that did not exist before", () => {
    const file = parseFreshServerFile(null, fileText("new"));
    assert.equal(file?.token, "new");
  });
});

describe("waitForDesktopServer", () => {
  it("resolves once a new file names a server that accepts its token", async () => {
    const server = createServer((_request, response) => response.end("[]"));
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as AddressInfo).port;
    const path = join(mkdtempSync(join(tmpdir(), "desktop-server-")), "env");
    const waiting = waitForDesktopServer(path, null, 10);
    writeFileSync(
      path,
      `EASYIMMERSE_DESKTOP_SERVER_URL='http://127.0.0.1:${port}'\nEASYIMMERSE_DESKTOP_TOKEN='t'\n`,
    );
    const file = await waiting;
    server.close();
    assert.equal(file.url, `http://127.0.0.1:${port}`);
  });
});
