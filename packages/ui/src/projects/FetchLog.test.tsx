import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exampleFailedJob } from "./exampleMediaSourceJob.ts";
import { FetchLog, formatLog } from "./FetchLog.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard() {
  const writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  return writeText;
}

describe("FetchLog", () => {
  it("copies the whole log as plain text", () => {
    const writeText = stubClipboard();
    render(<FetchLog lines={exampleFailedJob.log} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(formatLog(exampleFailedJob.log));
  });

  it("confirms the copy", async () => {
    stubClipboard();
    render(<FetchLog lines={exampleFailedJob.log} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeDefined();
  });

  it("copies nothing while the log is empty", () => {
    const writeText = stubClipboard();
    render(<FetchLog lines={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).not.toHaveBeenCalled();
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
