import type { ImportJobStarted, ImportJobStatus } from "@easyimmerse/types";
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
    parseDictionary: (fileName) => {
      if (fileName === "a.zip") throw new Error("not a zip archive");
      return {
        metadata: {
          title: "Words",
          revision: null,
          format: "csv",
          description: null,
          author: null,
          attribution: null,
          url: null,
          sourceLanguage: "de",
          targetLanguage: null,
          frequencyMode: null,
          stylesheet: null,
        },
        entries: [],
        termMeta: [],
        tags: [],
        kanjiEntries: [],
        kanjiMeta: [],
      };
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

  it("answers an import with a job that is already done", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const started = await client.send<ImportJobStarted>({
      method: "POST",
      path: "/dictionaries",
      offlineOperation: {
        kind: "importDictionary",
        fileName: "words.csv",
        bytes: new Uint8Array(),
        tableLayout: null,
      },
    });
    if (!("data" in started)) throw new Error("The import was refused.");
    const status = await client.send<ImportJobStatus>({
      method: "GET",
      path: `/dictionaries/imports/${started.data.id}`,
      offlineOperation: { kind: "importJobStatus", id: started.data.id },
    });
    expect("data" in status && status.data.dictionary?.title).toBe("Words");
  });

  it("finds no job for an unknown id", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const status = await client.send({
      method: "GET",
      path: "/dictionaries/imports/missing",
      offlineOperation: { kind: "importJobStatus", id: "missing" },
    });
    expect("error" in status && status.error.status).toBe(404);
  });

  it("maps a failure inside the module to a 400 error", async () => {
    const client = createWasmBackendClient(createFakeWasm());
    const result = await client.send({
      method: "POST",
      path: "/dictionaries",
      offlineOperation: {
        kind: "importDictionary",
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
