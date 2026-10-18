import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "./downloadFile.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Records the name each clicked link downloads under. */
function recordClicks(): string[] {
  const names: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  return names;
}

describe("downloadFile", () => {
  it("clicks a link that downloads under the file's name", () => {
    const names = recordClicks();
    downloadFile("Korean.apkg", new Uint8Array([1, 2]));
    expect(names).toEqual(["Korean.apkg"]);
  });

  it("removes the link once it is clicked", () => {
    recordClicks();
    downloadFile("Korean.apkg", new Uint8Array([1, 2]));
    expect(document.body.querySelector("a")).toBeNull();
  });

  it("revokes the file's object URL after a while", () => {
    vi.useFakeTimers();
    recordClicks();
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    downloadFile("Korean.apkg", new Uint8Array([1, 2]));
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
