import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BrowserFileStore,
  createBrowserFileStore,
} from "./browserFileStore.ts";
import { createPickFile } from "./pickFile.ts";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const subtitles = { kind: "subtitles", role: "target" } as const;

function findFileInput(): HTMLInputElement {
  const input = document.body.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) throw new Error("No file input.");
  return input;
}

function chooseFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new Event("change"));
}

describe("createPickFile", () => {
  it("resolves the chosen file's name", async () => {
    const picked = createPickFile(createBrowserFileStore())(subtitles, [
      ".srt",
    ]);
    chooseFile(findFileInput(), new File(["Hi"], "episode.srt"));
    expect((await picked)?.name).toBe("episode.srt");
  });

  it("stores the chosen file under the key of its browser_file source", async () => {
    const store = createBrowserFileStore();
    const picked = createPickFile(store)(subtitles, [".srt"]);
    const file = new File(["Hi"], "episode.srt");
    chooseFile(findFileInput(), file);
    const source = (await picked)?.source;
    const key = source?.kind === "browser_file" ? source.key : "";
    expect(await store.get(key)).not.toBeNull();
  });

  it("resolves a browser_file source", async () => {
    const picked = createPickFile(createBrowserFileStore())(subtitles, [
      ".srt",
    ]);
    chooseFile(findFileInput(), new File(["Hi"], "episode.srt"));
    expect((await picked)?.source.kind).toBe("browser_file");
  });

  it("rejects when the store cannot keep the chosen file", async () => {
    const store: BrowserFileStore = {
      ...createBrowserFileStore(),
      put: () => Promise.reject(new Error("The quota is exceeded.")),
    };
    const picked = createPickFile(store)(subtitles, [".srt"]);
    chooseFile(findFileInput(), new File(["Hi"], "episode.srt"));
    await expect(picked).rejects.toThrow("quota");
  });

  it("resolves null when the dialog is cancelled", async () => {
    const picked = createPickFile(createBrowserFileStore())(subtitles, [
      ".srt",
    ]);
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(await picked).toBeNull();
  });

  it("limits the input to the accepted extensions", () => {
    void createPickFile(createBrowserFileStore())(subtitles, [".srt", ".vtt"]);
    const input = findFileInput();
    expect(input.accept).toBe(".srt,.vtt");
    input.dispatchEvent(new Event("cancel"));
  });

  it("removes the input once a file is chosen", async () => {
    const picked = createPickFile(createBrowserFileStore())(subtitles, [
      ".srt",
    ]);
    chooseFile(findFileInput(), new File(["x"], "a.srt"));
    await picked;
    expect(document.body.querySelector("input[type=file]")).toBeNull();
  });

  it("opens the dialog by clicking the input", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    void createPickFile(createBrowserFileStore())(subtitles, [".srt"]);
    findFileInput().dispatchEvent(new Event("cancel"));
    expect(click).toHaveBeenCalledOnce();
  });
});
