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
    it("parses the Yomitan fixture into three entries", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        readFixtureBytes("sample-yomitan.zip"),
      );
      expect(dictionary.entries).toHaveLength(3);
    });

    it("reads the title of the Yomitan fixture", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        readFixtureBytes("sample-yomitan.zip"),
      );
      expect(dictionary.title).toBe("Sample Dictionary");
    });
  });

  describe("draftFlashcard", () => {
    it("uses the lemma for the word field", async () => {
      const wasm = await loadFromDisk();
      const card = wasm.draftFlashcard({
        word: "cats",
        lemma: "cat",
        reading: null,
        l1_definitions: ["Katze"],
        l2_definitions: [],
        context: null,
        context_translation: null,
        media_id: null,
        media_name: null,
        clip: null,
        screenshot_ms: null,
        settings: {
          included_fields: ["word"],
          default_tags: [],
          tag_with_media_name: true,
          use_tts_when_no_audio: false,
        },
      });
      expect(card.fields).toEqual([{ kind: "word", value: "cat" }]);
    });
  });

  describe("lookupTerm", () => {
    it("finds the entry for a term in a parsed dictionary", async () => {
      const wasm = await loadFromDisk();
      const dictionary = wasm.parseDictionary(
        readFixtureBytes("sample-yomitan-en.zip"),
      );
      const entries = wasm.lookupTerm(dictionary, "dog");
      expect(entries.map((entry) => entry.definitions)).toEqual([["Hund"]]);
    });
  });
});
