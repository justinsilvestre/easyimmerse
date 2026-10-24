import { describe, expect, it } from "vitest";
import {
  libraryDeletionText,
  libraryStatusText,
} from "./libraryPublicationTexts.ts";

describe("libraryStatusText", () => {
  it("names the clips and screenshots being made for a video", () => {
    expect(libraryStatusText("processing", "video")).toContain(
      "an audio clip and taking a screenshot for each subtitle",
    );
  });

  it("mentions no clips while a text is being prepared", () => {
    expect(libraryStatusText("processing", "document")).not.toContain("clip");
  });

  it("tells what to do next when a video failed to be prepared", () => {
    expect(libraryStatusText("failed", "video")).toContain(
      "then publish again",
    );
  });
});

describe("libraryDeletionText", () => {
  it("says learners can no longer listen to a deleted recording", () => {
    expect(libraryDeletionText("audio")).toContain(
      "can no longer listen to it",
    );
  });
});
