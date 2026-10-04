import { describe, expect, it } from "vitest";
import { pickDictionaryFile } from "./pickDictionaryFile.ts";

function findFileInput(): HTMLInputElement {
  const input = document.body.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("No file input.");
  return input;
}

function chooseFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new Event("change"));
}

describe("pickDictionaryFile", () => {
  it("resolves the chosen file's name and bytes", async () => {
    const picked = pickDictionaryFile();
    chooseFile(
      findFileInput(),
      new File([new Uint8Array([80, 75, 3, 4])], "jmdict.zip"),
    );
    expect(await picked).toEqual({
      name: "jmdict.zip",
      source: { kind: "bytes", bytes: new Uint8Array([80, 75, 3, 4]) },
    });
  });

  it("resolves null when the dialog is cancelled", async () => {
    const picked = pickDictionaryFile();
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(await picked).toBeNull();
  });

  it("limits the input to zip archives", () => {
    void pickDictionaryFile();
    const input = findFileInput();
    expect(input.accept).toBe(".zip");
    input.dispatchEvent(new Event("cancel"));
  });

  it("removes the input once a file is chosen", async () => {
    const picked = pickDictionaryFile();
    chooseFile(findFileInput(), new File(["x"], "a.zip"));
    await picked;
    expect(document.body.querySelector("input[type=file]")).toBeNull();
  });
});
