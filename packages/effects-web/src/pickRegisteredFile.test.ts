import { createBrowserFileRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { createPickRegisteredFile } from "./pickRegisteredFile.ts";

function findFileInput(): HTMLInputElement {
  const input = document.body.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("No file input.");
  return input;
}

function chooseFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new Event("change"));
}

const clip = new File(["abc"], "clip.webm", { lastModified: 1700000000000 });

describe("createPickRegisteredFile", () => {
  it("resolves the chosen file's name and a browser_file source", async () => {
    const picked = createPickRegisteredFile(createBrowserFileRegistry())([
      ".webm",
    ]);
    chooseFile(findFileInput(), clip);
    expect(await picked).toEqual({
      name: "clip.webm",
      source: {
        kind: "browser_file",
        size: 3,
        last_modified_ms: 1700000000000,
      },
    });
  });

  it("keeps the chosen file in the registry", async () => {
    const registry = createBrowserFileRegistry<File>();
    const picked = createPickRegisteredFile(registry)([".webm"]);
    chooseFile(findFileInput(), clip);
    const result = await picked;
    if (result === null) throw new Error("No file was picked.");
    expect(registry.find("clip.webm", result.source)).toBe(clip);
  });

  it("resolves null when the dialog is cancelled", async () => {
    const picked = createPickRegisteredFile(createBrowserFileRegistry())([
      ".webm",
    ]);
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(await picked).toBeNull();
  });

  it("limits the input to the accepted extensions", () => {
    void createPickRegisteredFile(createBrowserFileRegistry())([
      ".mp4",
      ".webm",
    ]);
    const input = findFileInput();
    expect(input.accept).toBe(".mp4,.webm");
    input.dispatchEvent(new Event("cancel"));
  });
});
