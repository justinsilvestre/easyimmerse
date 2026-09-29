export type SubtitlesCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

const timingPattern = /^(\S+)\s+-->\s+(\S+)/;

/** Reads the cues from the text of a WebVTT subtitles file. */
export function parseWebVtt(webVtt: string): SubtitlesCue[] {
  return splitIntoBlocks(webVtt).flatMap(parseBlock);
}

function splitIntoBlocks(webVtt: string): string[][] {
  const blocks = webVtt
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/);
  return blocks.map((block) => block.split("\n"));
}

/** Returns no cue for blocks without a timing line, such as the file header and notes. */
function parseBlock(lines: string[]): SubtitlesCue[] {
  const timingLineIndex = lines.findIndex((line) => timingPattern.test(line));
  const timing = lines[timingLineIndex]?.match(timingPattern);
  if (!timing) return [];
  const text = lines.slice(timingLineIndex + 1).join("\n");
  return [{ ...parseTiming(timing), text }];
}

function parseTiming([, start = "", end = ""]: RegExpMatchArray) {
  return {
    startSeconds: parseTimestamp(start),
    endSeconds: parseTimestamp(end),
  };
}

/** Converts a timestamp in the form `hh:mm:ss.ttt` or `mm:ss.ttt` to seconds. */
function parseTimestamp(timestamp: string): number {
  return timestamp
    .split(":")
    .reduce((seconds, part) => seconds * 60 + Number(part), 0);
}
