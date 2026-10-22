import { describe, expect, it } from "vitest";
import {
  type StoredCopyRequest,
  storedCopyFailureMessage,
} from "./storedCopyFailureMessage.ts";

const upload: StoredCopyRequest = {
  kind: "uploadStoredCopy",
  projectId: "p1",
  mediaFileId: "m1",
  file: {
    name: "film.mkv",
    source: { kind: "browser_file", size: 1, last_modified_ms: 0 },
  },
};

const choice = (isUploadChosen: boolean): StoredCopyRequest => ({
  kind: "setUploadChoice",
  projectId: "p1",
  mediaFileId: "m1",
  isUploadChosen,
});

const fetch: StoredCopyRequest = {
  kind: "fetchStoredCopy",
  projectId: "p1",
  mediaFileId: "m1",
};

const failed = { status: 500, message: "failed" } as const;

const message = (
  request: StoredCopyRequest,
  failure: Parameters<typeof storedCopyFailureMessage>[1],
) =>
  storedCopyFailureMessage(request, failure, "film.mkv", "cloud.example.org");

describe("storedCopyFailureMessage", () => {
  it("tells that the server has no room for an upload", () => {
    expect(
      message(upload, { status: 413, code: "quota_exceeded", message: "" }),
    ).toBe("There isn't enough room on cloud.example.org for this file.");
  });

  it("tells that the server keeps no copies", () => {
    expect(
      message(upload, {
        status: 409,
        code: "uploads_unavailable",
        message: "",
      }),
    ).toBe("cloud.example.org doesn't keep copies of media files.");
  });

  it("tells that the remote could not be reached", () => {
    expect(
      message(fetch, { status: 502, code: "remote_unreachable", message: "" }),
    ).toBe(
      "cloud.example.org couldn't be reached. Check your connection and try again.",
    );
  });

  it("tells to add a file again that the browser no longer holds", () => {
    expect(
      message(upload, { status: 404, code: "browserFileGone", message: "" }),
    ).toBe(
      "This browser no longer holds film.mkv. Add the file again to upload it.",
    );
  });

  it("tells that an upload failed", () => {
    expect(message(upload, failed)).toBe(
      "film.mkv couldn't be uploaded to cloud.example.org.",
    );
  });

  it("tells that a download failed", () => {
    expect(message(fetch, failed)).toBe(
      "film.mkv couldn't be downloaded from cloud.example.org.",
    );
  });

  it("tells that a deletion failed", () => {
    expect(message(choice(false), failed)).toBe(
      "film.mkv couldn't be deleted from cloud.example.org.",
    );
  });

  it("tells that the choice to keep a copy failed", () => {
    expect(message(choice(true), failed)).toBe(
      "cloud.example.org couldn't be asked to keep a copy of film.mkv.",
    );
  });
});
