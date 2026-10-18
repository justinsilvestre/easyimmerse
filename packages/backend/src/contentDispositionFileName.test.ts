import { describe, expect, it } from "vitest";
import { contentDispositionFileName } from "./contentDispositionFileName.ts";

const nameOf = (header: string | null) =>
  contentDispositionFileName(header, "flashcards.apkg");

describe("contentDispositionFileName", () => {
  it("prefers the UTF-8 name", () => {
    expect(
      nameOf(
        `attachment; filename="_____.apkg"; filename*=UTF-8''%ED%95%9C%EA%B5%AD%EC%96%B4.apkg`,
      ),
    ).toBe("한국어.apkg");
  });

  it("reads a quoted name", () => {
    expect(nameOf('attachment; filename="My \\"deck\\".apkg"')).toBe(
      'My "deck".apkg',
    );
  });

  it("reads an unquoted name", () => {
    expect(nameOf("attachment; filename=Korean.apkg")).toBe("Korean.apkg");
  });

  it("falls back to a quoted name when the UTF-8 name is malformed", () => {
    expect(
      nameOf(`attachment; filename="Korean.apkg"; filename*=UTF-8''%E0%A4%A`),
    ).toBe("Korean.apkg");
  });

  it("falls back when the header names no file", () => {
    expect(nameOf("attachment")).toBe("flashcards.apkg");
  });

  it("falls back without a header", () => {
    expect(nameOf(null)).toBe("flashcards.apkg");
  });
});
