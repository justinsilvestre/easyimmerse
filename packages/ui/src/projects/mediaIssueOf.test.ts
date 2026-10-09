import {
  type BrowserFileRegistry,
  createBrowserFileRegistry,
} from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { fixtureMediaFiles } from "../testSupport/fixtureResponses.ts";
import { mediaIssueOf } from "./mediaIssueOf.ts";

function fixtureMediaFile(id: string): MediaFile {
  const mediaFile = fixtureMediaFiles.media_files.find(
    (candidate) => candidate.id === id,
  );
  if (!mediaFile) throw new Error(`The fixture lists no media file ${id}.`);
  return mediaFile;
}

const pathFile = () => fixtureMediaFile("m1");
const browserFile = () => fixtureMediaFile("m2");

/** A registry that holds a file for every media file it is asked about. */
function registryHoldingAll(): BrowserFileRegistry<File> {
  return {
    ...createBrowserFileRegistry<File>(),
    find: (name) => new File([], name),
  };
}

describe("mediaIssueOf", () => {
  describe("for a file a browser holds", () => {
    it("tells the app cannot reach it when there is no registry", () => {
      expect(mediaIssueOf(browserFile(), null, new Map())).toBe(
        "browserFileUnreachable",
      );
    });

    it("tells it is no longer open when the registry does not hold it", () => {
      expect(
        mediaIssueOf(browserFile(), createBrowserFileRegistry(), new Map()),
      ).toBe("browserFileNotOpen");
    });

    it("finds no issue when the registry holds it", () => {
      expect(
        mediaIssueOf(browserFile(), registryHoldingAll(), new Map()),
      ).toBeUndefined();
    });
  });

  describe("for a file at a path", () => {
    it("tells it is missing when the server says so", () => {
      expect(mediaIssueOf(pathFile(), null, new Map([["m1", "missing"]]))).toBe(
        "pathMissing",
      );
    });

    it("tells the server may not read it when the server says so", () => {
      expect(
        mediaIssueOf(pathFile(), null, new Map([["m1", "not_allowed"]])),
      ).toBe("pathNotAllowed");
    });

    it("tells it is unreadable when the server says so", () => {
      expect(
        mediaIssueOf(pathFile(), null, new Map([["m1", "unreadable"]])),
      ).toBe("pathUnreadable");
    });

    it("finds no issue when the server says it is available", () => {
      expect(
        mediaIssueOf(pathFile(), null, new Map([["m1", "available"]])),
      ).toBeUndefined();
    });

    it("finds no issue when the server has not said", () => {
      expect(mediaIssueOf(pathFile(), null, new Map())).toBeUndefined();
    });
  });
});
