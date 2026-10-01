import { describe, expect, it, vi } from "vitest";
import { pickFile } from "./pickFile.ts";

function findFileInput(): HTMLInputElement {
  const input = document.body.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("No file input.");
  return input;
}

function chooseFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new Event("change"));
}

describe("pickFile", () => {
  it("resolves the chosen file's name and text", async () => {
    const picked = pickFile([".srt"]);
    chooseFile(
      findFileInput(),
      new File(["1\n00:00:01,000 --> 00:00:02,000\nHi"], "episode.srt"),
    );
    expect(await picked).toEqual({
      name: "episode.srt",
      source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHi" },
    });
  });

  it("resolves null when the dialog is cancelled", async () => {
    const picked = pickFile([".srt"]);
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(await picked).toBeNull();
  });

  it("limits the input to the accepted extensions", () => {
    void pickFile([".srt", ".vtt"]);
    const input = findFileInput();
    expect(input.accept).toBe(".srt,.vtt");
    input.dispatchEvent(new Event("cancel"));
  });

  it("removes the input once a file is chosen", async () => {
    const picked = pickFile([".srt"]);
    chooseFile(findFileInput(), new File(["x"], "a.srt"));
    await picked;
    expect(document.body.querySelector("input[type=file]")).toBeNull();
  });

  it("opens the dialog by clicking the input", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    void pickFile([".srt"]);
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(click).toHaveBeenCalledOnce();
  });
});
