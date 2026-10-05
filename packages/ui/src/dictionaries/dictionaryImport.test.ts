import { describe, expect, it } from "vitest";
import {
  initialDictionaryImport,
  isTableFile,
  reduceDictionaryImport,
} from "./dictionaryImport.ts";

const table = {
  fileName: "animals.csv",
  bytes: new Uint8Array([1]),
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

  it("keeps the refused file to name it", () => {
    expect(
      reduceDictionaryImport(initialDictionaryImport, {
        type: "refusedAsUnsupported",
        fileName: "duden.lsd",
      }).unsupportedFile,
    ).toBe("duden.lsd");
  });
});
