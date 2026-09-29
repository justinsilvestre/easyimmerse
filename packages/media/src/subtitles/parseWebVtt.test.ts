import { describe, expect, it } from "vitest";
import { parseWebVtt } from "./parseWebVtt.ts";

const webVtt = `WEBVTT

NOTE This is a comment.

1
00:01.000 --> 00:02.500
Guten Tag!

01:00:03.000 --> 01:00:04.000 align:start
Wie geht es
dir?
`;

describe("parseWebVtt", () => {
  it("skips blocks without timings", () => {
    expect(parseWebVtt(webVtt)).toHaveLength(2);
  });

  it("reads timings without hours", () => {
    expect(parseWebVtt(webVtt)[0]).toMatchObject({
      startSeconds: 1,
      endSeconds: 2.5,
    });
  });

  it("reads timings with hours", () => {
    expect(parseWebVtt(webVtt)[1]).toMatchObject({
      startSeconds: 3603,
      endSeconds: 3604,
    });
  });

  it("reads text spanning several lines", () => {
    expect(parseWebVtt(webVtt)[1]?.text).toBe("Wie geht es\ndir?");
  });

  it("reads files with Windows line endings", () => {
    const cues = parseWebVtt(webVtt.replaceAll("\n", "\r\n"));
    expect(cues[0]?.text).toBe("Guten Tag!");
  });
});
