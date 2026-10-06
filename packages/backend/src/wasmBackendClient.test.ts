import type { OfflineWasm } from "@easyimmerse/wasm";
import { describe, expect, it } from "vitest";
import { createWasmBackendClient } from "./wasmBackendClient.ts";

const srt = "1\n00:00:01,000 --> 00:00:02,000\nHello\n";

function createFakeWasm(): OfflineWasm {
  return {
    parseTimedText: (request) => ({
      format: "srt",
      cues: [
        { index: 1, start_ms: 1000, end_ms: 2000, text: request.source.kind },
      ],
    }),
    parseDocument: () => ({ title: "Doc", language: null, chapters: [] }),
    parseDictionary: () => {
      throw new Error("not a zip archive");
    },
    previewDictionaryTable: () => ({
      layout: { columns: ["term", "definition"], hasHeader: false },
      rows: [["cat", "a pet"]],
    }),
  };
}

describe("createWasmBackendClient", () => {
  it("runs the offline operation of a request that has one", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const result = await client.send({
      method: "POST",
      path: "/timed-text/parse",
      offlineOperation: {
        kind: "parseTimedText",
        request: { source: { kind: "inline", text: srt }, format: null },
      },
    });
    expect(result).toEqual({
      data: {
        format: "srt",
        cues: [{ index: 1, start_ms: 1000, end_ms: 2000, text: "inline" }],
      },
    });
  });

  it("returns an OFFLINE error for a request without an offline operation", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const result = await client.send({ method: "GET", path: "/projects" });
    expect(result).toEqual({
      error: {
        status: "OFFLINE",
        message: "GET /projects needs a server, and none is configured.",
      },
    });
  });

  it("maps a failure inside the module to a 400 error", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const result = await client.send({
      method: "POST",
      path: "/dictionaries",
      offlineOperation: {
        kind: "parseDictionary",
        fileName: "a.zip",
        bytes: new Uint8Array(),
        tableLayout: null,
      },
    });
    expect(result).toEqual({
      error: { status: 400, code: "bad_request", message: "not a zip archive" },
    });
  });
});
