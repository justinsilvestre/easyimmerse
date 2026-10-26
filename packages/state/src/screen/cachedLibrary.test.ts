import { describe, expect, it } from "vitest";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { isCachedLibraryFileLocked } from "./cachedLibrary.ts";
import {
  learner,
  withLibraryVideoFor,
} from "./libraryPreparationTestSupport.ts";

const manager = { kind: "launch" } as const;

describe("isCachedLibraryFileLocked", () => {
  it("is false for the file of a draft that a library manager prepares", () => {
    const backend = withLibraryVideoFor(manager, { kind: "draft" });
    expect(isCachedLibraryFileLocked(backend, "p1", "m1")).toBe(false);
  });

  it("is false for the file of an item that failed to publish, which a library manager prepares again", () => {
    const status = { kind: "failed", message: "no audio" } as const;
    const backend = withLibraryVideoFor(manager, status);
    expect(isCachedLibraryFileLocked(backend, "p1", "m1")).toBe(false);
  });

  it("is true for the file of a published item, even for a library manager", () => {
    const backend = withLibraryVideoFor(manager, { kind: "published" });
    expect(isCachedLibraryFileLocked(backend, "p1", "m1")).toBe(true);
  });

  it("is true for a learner's file of a draft", () => {
    const backend = withLibraryVideoFor(learner, { kind: "draft" });
    expect(isCachedLibraryFileLocked(backend, "p1", "m1")).toBe(true);
  });

  it("is false for a file from anywhere else", () => {
    const backend = serverCacheWith("listMediaFiles", "p1", {
      media_files: [exampleMediaFile("m1", "film.mp4")],
    });
    expect(isCachedLibraryFileLocked(backend, "p1", "m1")).toBe(false);
  });
});
