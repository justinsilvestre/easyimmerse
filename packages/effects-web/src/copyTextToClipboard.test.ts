import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./copyTextToClipboard.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubExecCommand() {
  const execCommand = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
  });
  return execCommand;
}

describe("copyTextToClipboard", () => {
  describe("when the clipboard API is present", () => {
    it("writes the text through it", async () => {
      const writeText = vi.fn(() => Promise.resolve());
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      await copyTextToClipboard("hello");
      expect(writeText).toHaveBeenCalledWith("hello");
    });
  });

  describe("when the clipboard API is absent", () => {
    it("copies the selected text with execCommand", async () => {
      vi.stubGlobal("navigator", {});
      const execCommand = stubExecCommand();
      await copyTextToClipboard("hello");
      expect(execCommand).toHaveBeenCalledWith("copy");
    });

    it("removes the textarea afterwards", async () => {
      vi.stubGlobal("navigator", {});
      stubExecCommand();
      await copyTextToClipboard("hello");
      expect(document.querySelector("textarea")).toBeNull();
    });
  });
});
