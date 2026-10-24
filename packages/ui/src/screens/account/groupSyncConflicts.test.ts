import type { SyncConflict } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { groupSyncConflicts } from "./groupSyncConflicts.ts";

const conflict = (
  id: string,
  projectName: string | null,
  mediaFileName: string | null = null,
): SyncConflict => ({
  id,
  description: "a flashcard",
  project_name: projectName,
  media_file_name: mediaFileName,
  kept: "other_device",
  detected_at_ms: 0,
});

describe("groupSyncConflicts", () => {
  it("groups the conflicts by project, in the order of each project's first conflict", () => {
    const groups = groupSyncConflicts([
      conflict("c1", "Spanish"),
      conflict("c2", "German"),
      conflict("c3", "Spanish"),
    ]);
    expect(groups.map(({ projectName }) => projectName)).toEqual([
      "Spanish",
      "German",
    ]);
  });

  it("keeps a project's conflicts of no media file apart from its media files", () => {
    const [spanish] = groupSyncConflicts([
      conflict("c1", "Spanish", "Episode 1.mp4"),
      conflict("c2", "Spanish"),
    ]);
    expect(spanish?.conflicts.map(({ id }) => id)).toEqual(["c2"]);
  });

  it("groups a project's conflicts by media file", () => {
    const [spanish] = groupSyncConflicts([
      conflict("c1", "Spanish", "Episode 1.mp4"),
      conflict("c2", "Spanish", "Episode 2.mp4"),
      conflict("c3", "Spanish", "Episode 1.mp4"),
    ]);
    expect(spanish?.mediaFiles).toEqual([
      {
        mediaFileName: "Episode 1.mp4",
        conflicts: [
          conflict("c1", "Spanish", "Episode 1.mp4"),
          conflict("c3", "Spanish", "Episode 1.mp4"),
        ],
      },
      {
        mediaFileName: "Episode 2.mp4",
        conflicts: [conflict("c2", "Spanish", "Episode 2.mp4")],
      },
    ]);
  });

  it("puts the conflicts of no project last", () => {
    const groups = groupSyncConflicts([
      conflict("c1", null),
      conflict("c2", "Spanish"),
    ]);
    expect(groups.map(({ projectName }) => projectName)).toEqual([
      "Spanish",
      null,
    ]);
  });
});
