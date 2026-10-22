import type { SyncConflict } from "@easyimmerse/types";

const minuteMs = 60 * 1000;

const minutesAgo = (minutes: number) => Date.now() - minutes * minuteMs;

/** Conflicts newest first, in two projects with a media file each, and one of no project. */
export const fixtureSyncConflicts: SyncConflict[] = [
  {
    id: "c6",
    description: "the flashcard “fressen”",
    project_name: "German practice",
    media_file_name: "Der Prozess.epub",
    kept: "other_device",
    detected_at_ms: minutesAgo(1),
  },
  {
    id: "c5",
    description: "the flashcard “madrugada”",
    project_name: "Spanish practice",
    media_file_name: "Episode 4.mp4",
    kept: "this_device",
    detected_at_ms: minutesAgo(2),
  },
  {
    id: "c4",
    description: "the reading position",
    project_name: "German practice",
    media_file_name: "Der Prozess.epub",
    kept: "this_device",
    detected_at_ms: minutesAgo(3),
  },
  {
    id: "c3",
    description: "the project's settings",
    project_name: "German practice",
    media_file_name: null,
    kept: "other_device",
    detected_at_ms: minutesAgo(4),
  },
  {
    id: "c2",
    description: "a subtitle track",
    project_name: "Spanish practice",
    media_file_name: "Episode 4.mp4",
    kept: "deletion",
    detected_at_ms: minutesAgo(5),
  },
  {
    id: "c1",
    description: "whether translations are shown",
    project_name: null,
    media_file_name: null,
    kept: "this_device",
    detected_at_ms: minutesAgo(6),
  },
];

/** Older conflicts than those above, which only the full list holds. */
export const fixtureOlderSyncConflicts: SyncConflict[] = [
  {
    id: "c0",
    description: "a review answer",
    project_name: "Spanish practice",
    media_file_name: null,
    kept: "deletion",
    detected_at_ms: minutesAgo(30),
  },
  {
    id: "c-1",
    description: "the playback position",
    project_name: "Spanish practice",
    media_file_name: "Episode 3.mp4",
    kept: "other_device",
    detected_at_ms: minutesAgo(31),
  },
];
