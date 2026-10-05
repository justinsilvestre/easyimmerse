import { readFileSync } from "node:fs";
import { readFixtureBytes, readFixtureText } from "@easyimmerse/fixtures";
import { describe, expect, it } from "vitest";
import { loadOfflineWasm } from "./loadOfflineWasm.ts";
import type { OfflineWasm } from "./offlineWasm.ts";

function loadFromDisk(): Promise<OfflineWasm> {
  const wasmUrl = new URL("../pkg/easyimmerse_wasm_bg.wasm", import.meta.url);
  return loadOfflineWasm(readFileSync(wasmUrl));
}

describe("OfflineWasm", () => {
  describe("parseTimedText", () => {
    it("parses the inline SRT fixture into four cues", async () => {
      const wasm = await loadFromDisk();
      const track = wasm.parseTimedText({
        source: { kind: "inline", text: readFixtureText("sample.srt") },
        format: null,
      });
      expect(track.cues).toHaveLength(4);
    });

    it("keeps line breaks within a cue", async () => {
      const wasm = await loadFromDisk();
      const track = wasm.parseTimedText({
        source: { kind: "inline", text: readFixtureText("sample.srt") },
        format: null,
      });
      expect(track.cues[1]?.text).toBe("The dog wants to eat.\nIt is hungry.");
    });

    it("throws for a path source", async () => {
      const wasm = await loadFromDisk();
      expect(() =>
        wasm.parseTimedText({
          source: { kind: "path", path: "/tmp/sample.srt" },
          format: null,
        }),
      ).toThrow("local paths are not available offline");
    });
  });

  describe("parseDocument", () => {
    it("parses the EPUB fixture into two chapters", async () => {
      const wasm = await loadFromDisk();
      const document = wasm.parseDocument(
        readFixtureBytes("sample.epub"),
        null,
      );
      expect(document.chapters).toHaveLength(2);
    });
  });

  describe("parseDictionary", () => {
    it("reads the cat entry of the Yomitan fixture", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        "sample-yomitan.zip",
        readFixtureBytes("sample-yomitan.zip"),
      );
      expect(dictionary.entries.map((entry) => entry.term)).toContain("猫");
    });

    it("reads the title of the Yomitan fixture", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        "sample-yomitan.zip",
        readFixtureBytes("sample-yomitan.zip"),
      );
      expect(dictionary.metadata.title).toBe("Sample Dictionary");
    });

    it("throws for a file that no format recognizes", async () => {
      const wasm = await loadFromDisk();
      expect(() =>
        wasm.parseDictionary("notes.txt", new TextEncoder().encode("hello")),
      ).toThrow("no supported dictionary format");
    });

    it("skips the header row of a table when the layout says so", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        "words.csv",
        new TextEncoder().encode("Wort;Bedeutung\nHund;dog\n"),
        { columns: ["term", "definition"], hasHeader: true },
      );
      expect(dictionary.entries.map((entry) => entry.term)).toEqual(["Hund"]);
    });
  });

  describe("previewDictionaryTable", () => {
    it("detects the columns of a headerless table", async () => {
      const wasm = await loadFromDisk();
      const preview = wasm.previewDictionaryTable(
        "words.csv",
        new TextEncoder().encode("猫,ねこ,cat\n"),
      );
      expect(preview.layout.columns).toEqual(["term", "reading", "definition"]);
    });
  });
});
