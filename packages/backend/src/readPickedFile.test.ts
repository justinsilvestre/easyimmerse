import { createBrowserFileRegistry } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { isSamePickedFile, readPickedFile } from "./readPickedFile.ts";

/** A file whose bytes cannot be read, as when it was deleted after being picked. */
class UnreadableFile extends File {
  override arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.reject(new Error("The file could not be read."));
  }
}

function held(file: File) {
  const registry = createBrowserFileRegistry<File>();
  return {
    registry,
    picked: { name: file.name, source: registry.register(file) },
  };
}

describe("readPickedFile", () => {
  it("returns the bytes of a file the browser holds", async () => {
    const { registry, picked } = held(new File(["abc"], "a.txt"));
    const read = await readPickedFile(picked, registry);
    expect("bytes" in read && new TextDecoder().decode(read.bytes)).toBe("abc");
  });

  it("fails on a platform that holds no browser files", async () => {
    const { picked } = held(new File(["abc"], "a.txt"));
    expect(await readPickedFile(picked, null)).toMatchObject({
      error: { code: "browserFileUnreachable" },
    });
  });

  it("fails for a file the browser no longer holds", async () => {
    const { picked } = held(new File(["abc"], "a.txt"));
    const other = createBrowserFileRegistry<File>();
    expect(await readPickedFile(picked, other)).toMatchObject({
      error: { code: "browserFileGone" },
    });
  });

  it("fails with the reader's message for a file that cannot be read", async () => {
    const { registry, picked } = held(new UnreadableFile([], "a.zip"));
    expect(await readPickedFile(picked, registry)).toMatchObject({
      error: {
        code: "browserFileUnreadable",
        message: "The file could not be read.",
      },
    });
  });
});

describe("isSamePickedFile", () => {
  const picked = {
    name: "clip.mp4",
    source: { kind: "browser_file", size: 5, last_modified_ms: 1 } as const,
  };

  it("matches a file with the same name and source", () => {
    expect(
      isSamePickedFile(picked, { ...picked, source: { ...picked.source } }),
    ).toBe(true);
  });

  it("tells apart files whose sources differ", () => {
    expect(
      isSamePickedFile(picked, {
        ...picked,
        source: { ...picked.source, size: 6 },
      }),
    ).toBe(false);
  });

  it("never matches files with paths", () => {
    const onDisk = {
      name: "clip.mp4",
      source: { kind: "path", path: "/clip.mp4" } as const,
    };
    expect(isSamePickedFile(onDisk, onDisk)).toBe(false);
  });

  it("tells apart files whose names differ", () => {
    expect(isSamePickedFile(picked, { ...picked, name: "other.mp4" })).toBe(
      false,
    );
  });
});
