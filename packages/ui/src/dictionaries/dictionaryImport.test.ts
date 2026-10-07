import { describe, expect, it } from "vitest";
import {
  initialDictionaryImport,
  isTableFile,
  reduceDictionaryImport,
} from "./dictionaryImport.ts";

const table = {
  fileName: "animals.csv",
  contents: { kind: "bytes", bytes: new Uint8Array([1]) } as const,
  preview: { layout: { columns: [], hasHeader: false }, rows: [] },
};

describe("isTableFile", () => {
  it("counts a Tabfile as a table", () => {
    expect(isTableFile("Wörter.TAB")).toBe(true);
  });

  it("leaves out an archive", () => {
    expect(isTableFile("jmdict.zip")).toBe(false);
  });
});

describe("reduceDictionaryImport", () => {
  it("forgets an earlier unsupported file once another one is added", () => {
    const refused = reduceDictionaryImport(initialDictionaryImport, {
      type: "refusedAsUnsupported",
      fileName: "duden.lsd",
    });
    expect(
      reduceDictionaryImport(refused, { type: "started", fileName: "a.zip" })
        .unsupportedFile,
    ).toBeNull();
  });

  it("stops adding once a table waits for its columns to be checked", () => {
    const started = reduceDictionaryImport(initialDictionaryImport, {
      type: "started",
      fileName: "animals.csv",
    });
    expect(
      reduceDictionaryImport(started, { type: "tablePreviewed", table })
        .addingFile,
    ).toBeNull();
  });

  it("remembers the job once the server has started it", () => {
    const started = reduceDictionaryImport(initialDictionaryImport, {
      type: "started",
      fileName: "a.zip",
    });
    expect(
      reduceDictionaryImport(started, { type: "jobStarted", jobId: "j1" })
        .jobId,
    ).toBe("j1");
  });

  it("stops adding once the import has failed", () => {
    const started = reduceDictionaryImport(initialDictionaryImport, {
      type: "started",
      fileName: "a.zip",
    });
    expect(
      reduceDictionaryImport(started, { type: "failed", message: "broken" })
        .addingFile,
    ).toBeNull();
  });

  it("forgets an earlier failure once another file is added", () => {
    const failed = reduceDictionaryImport(initialDictionaryImport, {
      type: "failed",
      message: "broken",
    });
    expect(
      reduceDictionaryImport(failed, { type: "started", fileName: "a.zip" })
        .importFailure,
    ).toBeNull();
  });

  it("keeps the refused file to name it", () => {
    expect(
      reduceDictionaryImport(initialDictionaryImport, {
        type: "refusedAsUnsupported",
        fileName: "duden.lsd",
      }).unsupportedFile,
    ).toBe("duden.lsd");
  });
});
