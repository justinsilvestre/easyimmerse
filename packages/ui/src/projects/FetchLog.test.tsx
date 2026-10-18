import type { MediaSourceLogLine } from "@easyimmerse/types";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { exampleFailedJob } from "./exampleMediaSourceJob.ts";
import { FetchLog, formatLog } from "./FetchLog.tsx";

afterEach(cleanup);

/** Renders the log over a fresh store, presses Copy, and returns the effects asked for. */
function pressCopy(lines: readonly MediaSourceLogLine[]) {
  const { effects } = renderWithAppStore(<FetchLog lines={lines} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  return effects.calls;
}

describe("FetchLog", () => {
  it("asks for the whole log to be copied as plain text", () => {
    expect(pressCopy(exampleFailedJob.log)).toContainEqual({
      type: "copyText",
      text: formatLog(exampleFailedJob.log),
    });
  });

  it("copies nothing while the log is empty", () => {
    expect(pressCopy([]).some((call) => call.type === "copyText")).toBe(false);
  });
});

describe("formatLog", () => {
  it("marks each line with its level", () => {
    expect(
      formatLog([
        { at_ms: 0, level: "info", message: "resolving" },
        { at_ms: 1, level: "warn", message: "no subtitles" },
      ]),
    ).toBe("[info] resolving\n[warn] no subtitles");
  });
});
