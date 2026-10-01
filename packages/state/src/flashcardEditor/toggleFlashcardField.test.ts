import type { FlashcardField } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { toggleFlashcardField } from "./toggleFlashcardField.ts";

const fields: FlashcardField[] = [
  { kind: "word", value: "Katze" },
  { kind: "context", value: "Die Katze schläft." },
];

describe("toggleFlashcardField", () => {
  it("removes a field the card has", () => {
    expect(toggleFlashcardField(fields, "word")).toEqual([
      { kind: "context", value: "Die Katze schläft." },
    ]);
  });

  it("inserts a missing field in its canonical position with an empty value", () => {
    expect(toggleFlashcardField(fields, "l1_definition")).toEqual([
      { kind: "word", value: "Katze" },
      { kind: "l1_definition", value: "" },
      { kind: "context", value: "Die Katze schläft." },
    ]);
  });

  it("appends the screenshot field last", () => {
    const kinds = toggleFlashcardField(fields, "screenshot").map(
      (field) => field.kind,
    );
    expect(kinds).toEqual(["word", "context", "screenshot"]);
  });

  it("puts out-of-order fields back in canonical order when adding", () => {
    const reversed = [...fields].reverse();
    const kinds = toggleFlashcardField(reversed, "word_pronunciation").map(
      (field) => field.kind,
    );
    expect(kinds).toEqual(["word", "word_pronunciation", "context"]);
  });
});
