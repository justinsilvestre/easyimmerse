import { describe, expect, it } from "vitest";
import { splitIntoWords } from "./ClickableText.tsx";
import { reduceTextCursor, stepTextCursor } from "./textCursor.ts";

describe("stepTextCursor", () => {
  it("moves forward to the next word written with spaces", () => {
    expect(stepTextCursor(splitIntoWords("Ich rufe an."), 0, "forward")).toBe(
      4,
    );
  });

  it("moves backward to the previous word written with spaces", () => {
    expect(stepTextCursor(splitIntoWords("Ich rufe an."), 9, "backward")).toBe(
      4,
    );
  });

  it("moves forward one character within a run written without spaces", () => {
    expect(stepTextCursor(splitIntoWords("映画を見る"), 2, "forward")).toBe(3);
  });

  it("steps over a character outside the Basic Multilingual Plane whole", () => {
    expect(stepTextCursor(splitIntoWords("𠮷野家"), 0, "forward")).toBe(2);
  });

  it("moves from the end of a run to the next word", () => {
    expect(stepTextCursor(splitIntoWords("見る、Netflix"), 1, "forward")).toBe(
      3,
    );
  });

  it("skips punctuation, which holds nothing to look up", () => {
    expect(stepTextCursor(splitIntoWords("見る。今日"), 3, "backward")).toBe(1);
  });

  it("stays at the last word", () => {
    expect(stepTextCursor(splitIntoWords("Ich rufe an."), 9, "forward")).toBe(
      9,
    );
  });

  it("stays at the first word", () => {
    expect(stepTextCursor(splitIntoWords("Ich rufe an."), 0, "backward")).toBe(
      0,
    );
  });
});

describe("reduceTextCursor", () => {
  it("points at where the mouse is", () => {
    expect(
      reduceTextCursor(null, { type: "pointed", start: 3, input: "mouse" }),
    ).toEqual({ start: 3, input: "mouse" });
  });

  it("shows the cursor once its lookup has answered", () => {
    expect(
      reduceTextCursor(
        { start: 3, input: "keyboard" },
        { type: "answered", start: 3, input: "keyboard", matchedLength: 2 },
      ),
    ).toEqual({ start: 3, input: "keyboard", matchedLength: 2 });
  });

  it("stays while the mouse moves within the text its lookup matched", () => {
    const cursor = { start: 3, input: "mouse", matchedLength: 2 } as const;
    expect(
      reduceTextCursor(cursor, { type: "pointed", start: 4, input: "mouse" }),
    ).toBe(cursor);
  });

  it("moves when the mouse moves beyond the text its lookup matched", () => {
    expect(
      reduceTextCursor(
        { start: 3, input: "mouse", matchedLength: 2 },
        { type: "pointed", start: 0, input: "mouse" },
      ),
    ).toEqual({ start: 0, input: "mouse" });
  });

  it("moves with the keyboard within the text its lookup matched", () => {
    expect(
      reduceTextCursor(
        { start: 3, input: "keyboard", matchedLength: 2 },
        { type: "pointed", start: 4, input: "keyboard" },
      ),
    ).toEqual({ start: 4, input: "keyboard" });
  });

  it("goes when the input that placed it leaves", () => {
    expect(
      reduceTextCursor(
        { start: 3, input: "mouse" },
        { type: "left", input: "mouse" },
      ),
    ).toBeNull();
  });

  it("stays when another input leaves", () => {
    const cursor = { start: 3, input: "keyboard" } as const;
    expect(reduceTextCursor(cursor, { type: "left", input: "mouse" })).toBe(
      cursor,
    );
  });
});
