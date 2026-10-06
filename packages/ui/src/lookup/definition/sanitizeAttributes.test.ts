import { describe, expect, it } from "vitest";
import {
  dataAttributes,
  languageTag,
  tableSpan,
} from "./sanitizeAttributes.ts";

describe("dataAttributes", () => {
  it("prefixes each key with data-sc-", () => {
    expect(dataAttributes({ content: "sense" })).toEqual({
      "data-sc-content": "sense",
    });
  });

  it("drops a key with characters outside letters, digits, dashes and underscores", () => {
    expect(dataAttributes({ 'x" onclick="y': "z" })).toEqual({});
  });
});

describe("languageTag", () => {
  it("accepts a BCP 47 tag", () => {
    expect(languageTag("zh-Hant-TW")).toBe("zh-Hant-TW");
  });

  it("rejects anything else", () => {
    expect(languageTag("ja; x")).toBeUndefined();
  });
});

describe("tableSpan", () => {
  it("rejects a span below one", () => {
    expect(tableSpan(0)).toBeUndefined();
  });

  it("caps a very large span", () => {
    expect(tableSpan(1e9)).toBe(1000);
  });
});
