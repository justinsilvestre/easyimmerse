import { describe, expect, it } from "vitest";
import { classifyHref } from "./classifyHref.ts";

describe("classifyHref", () => {
  it("reads a query string as a lookup of its query", () => {
    expect(classifyHref("?query=一の字点&wildcards=off")).toEqual({
      kind: "lookup",
      term: "一の字点",
    });
  });

  it("reads a bword link as a lookup", () => {
    expect(classifyHref("bword://chance")).toEqual({
      kind: "lookup",
      term: "chance",
    });
  });

  it("reads an entry link as a lookup, without its anchor", () => {
    expect(classifyHref("entry://fruit%20tree#sense2")).toEqual({
      kind: "lookup",
      term: "fruit tree",
    });
  });

  it("reads an entry link to an anchor within the same entry as a fragment", () => {
    expect(classifyHref("entry://#top")).toEqual({
      kind: "fragment",
      id: "top",
    });
  });

  it("reads a same-document link as a fragment", () => {
    expect(classifyHref("#sense%202")).toEqual({
      kind: "fragment",
      id: "sense 2",
    });
  });

  it("ignores a link to an empty fragment", () => {
    expect(classifyHref("#")).toEqual({ kind: "none" });
  });

  it("reads a sound link as a sound", () => {
    expect(classifyHref("sound://us/apple.mp3")).toEqual({
      kind: "sound",
      path: "us/apple.mp3",
    });
  });

  it("reads an https link as external", () => {
    expect(classifyHref("https://example.com/a")).toEqual({
      kind: "external",
      url: "https://example.com/a",
    });
  });

  it("ignores a javascript link", () => {
    expect(classifyHref("javascript:alert(1)")).toEqual({ kind: "none" });
  });

  it("ignores a javascript link hidden behind whitespace and case", () => {
    expect(classifyHref("  JaVaScRiPt:alert(1)")).toEqual({ kind: "none" });
  });

  it("ignores a data link", () => {
    expect(classifyHref("data:text/html,<script>")).toEqual({ kind: "none" });
  });
});
