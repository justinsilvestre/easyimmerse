import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { fixtureMediaFiles } from "../../testSupport/fixtureResponses.ts";
import { mediaCopyOf } from "./mediaCopyOf.ts";

function fixtureMediaFile(id: string): MediaFile {
  const mediaFile = fixtureMediaFiles.media_files.find(
    (candidate) => candidate.id === id,
  );
  if (!mediaFile) throw new Error(`The fixture lists no media file ${id}.`);
  return mediaFile;
}

const pathFile = () => fixtureMediaFile("m1");
const browserFile = () => fixtureMediaFile("m2");

/** A registry that holds the browser file of the fixture. */
function registryHoldingIt() {
  const registry = createBrowserFileRegistry<File>();
  const { source, name } = browserFile();
  if (source.kind === "browser_file")
    registry.register(
      new File([new Uint8Array(source.size)], name, {
        lastModified: source.last_modified_ms,
      }),
    );
  return registry;
}

describe("mediaCopyOf", () => {
  it("tells that the browser holds a file it added", () => {
    expect(
      mediaCopyOf(browserFile(), registryHoldingIt(), new Map()).browserFile,
    ).toBe("held");
  });

  it("tells that the browser no longer holds a file it added", () => {
    expect(
      mediaCopyOf(browserFile(), createBrowserFileRegistry(), new Map())
        .browserFile,
    ).toBe("gone");
  });

  it("tells no browser file for a file at a path", () => {
    expect(mediaCopyOf(pathFile(), null, new Map()).browserFile).toBeNull();
  });

  it("tells that the server cannot read a missing file", () => {
    expect(
      mediaCopyOf(pathFile(), null, new Map([["m1", "missing"]]))
        .isUnreadableHere,
    ).toBe(true);
  });

  it("does not tell the server cannot read a file whose copy plays in its place", () => {
    expect(
      mediaCopyOf(pathFile(), null, new Map([["m1", "stored_copy"]]))
        .isUnreadableHere,
    ).toBe(false);
  });

  it("does not tell the server cannot read a file before it has said", () => {
    expect(mediaCopyOf(pathFile(), null, new Map()).isUnreadableHere).toBe(
      false,
    );
  });
});
