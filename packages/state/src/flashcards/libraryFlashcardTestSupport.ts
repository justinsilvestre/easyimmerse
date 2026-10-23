import type { Cue, MediaFile } from "@easyimmerse/types";
import { exampleLibraryVideoText } from "../screen/exampleLibraryText.ts";
import { cuesOfLibraryText } from "../screen/libraryText.ts";
import { chosenWord } from "../screen/lookup/lookupTestSupport.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";

/** The media file m1 of project p1, added from the library item i1. */
export const libraryVideo: MediaFile = {
  ...exampleMediaFile("m1", "Im Park"),
  source: { kind: "library", item_id: "i1" },
};

/** The server cache once p1's settings, its library media file m1, and the text of item i1 are read. */
export const withLibraryVideo: ServerCacheSlice = serverCacheWith(
  "getLibraryText",
  "i1",
  exampleLibraryVideoText,
  serverCacheWith(
    "getProject",
    "p1",
    exampleProject("p1"),
    serverCacheWith("listMediaFiles", "p1", { media_files: [libraryVideo] }),
  ),
);

/** The word "Hund" of the first cue of item i1, as the lookup cursor chooses it. */
export const libraryHund = chosenWord(
  "Hund",
  4,
  cuesOfLibraryText(exampleLibraryVideoText).cues[0] as Cue,
);

/** Where a library flashcard for "Hund" in m1 comes from. */
export const hundPlace = {
  projectId: "p1",
  mediaFileId: "m1",
  segmentIndex: 0,
  wordStart: 4,
};
