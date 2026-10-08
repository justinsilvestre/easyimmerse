import { describe, expect, it } from "vitest";
import { reduceTextCursor } from "./textCursor.ts";

describe("reduceTextCursor", () => {
  it("points at where the mouse is", () => {
    expect(
      reduceTextCursor(null, { type: "pointed", start: 3, input: "mouse" }),
    ).toEqual({ start: 3, input: "mouse" });
  });

  it("takes the length a cached lookup matched at once", () => {
    expect(
      reduceTextCursor(null, {
        type: "pointed",
        start: 3,
        input: "mouse",
        matchedLength: 2,
      }),
    ).toEqual({ start: 3, input: "mouse", matchedLength: 2 });
  });

  it("keeps its identity when the lookup answers what was cached", () => {
    const cursor = { start: 3, input: "mouse", matchedLength: 2 } as const;
    expect(
      reduceTextCursor(cursor, {
        type: "answered",
        start: 3,
        input: "mouse",
        matchedLength: 2,
      }),
    ).toBe(cursor);
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

  it("moves when the mouse moves to another character before its lookup answered", () => {
    expect(
      reduceTextCursor(
        { start: 3, input: "mouse" },
        { type: "pointed", start: 4, input: "mouse" },
      ),
    ).toEqual({ start: 4, input: "mouse" });
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
