import type { Cue, SubtitleTracksResponse } from "@easyimmerse/types";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { exampleProject } from "../../server/exampleProject.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import { chosenWord } from "../lookup/lookupTestSupport.ts";
import { exampleCues, exampleTranslationCues } from "./exampleCues.ts";

const file = { projectId: "p1", mediaFileId: "m1" };

/** The media file m1 of project p1: a video on the server's disk. */
export const exampleVideo = exampleMediaFile("m1", "Dark S01E01.mkv");

/** The cue of the example scene in which the dog wants to eat, shown from 5.4 to 8.2 seconds. */
export const hungerCue = exampleCues[2] as Cue;

/** The word "fressen" of `hungerCue`, as the lookup cursor chooses it. */
export const fressen = chosenWord("fressen", 14, hungerCue);

/** The server cache once the record of m1 and the settings of p1 are read, which the media screen makes flashcards from. */
export const withFlashcardSources: ServerCacheSlice = serverCacheWith(
  "getProject",
  "p1",
  exampleProject("p1"),
  serverCacheWith("listMediaFiles", "p1", { media_files: [exampleVideo] }),
);

const tracks: SubtitleTracksResponse = {
  tracks: [],
  selection: { target_track_id: "t1", translation_track_id: "t2" },
};

/** `withFlashcardSources` with the example cues chosen for the target language and their translation for the translation language. */
export const withExampleCues: ServerCacheSlice = serverCacheWith(
  "getSubtitleCues",
  { ...file, trackId: "t2" },
  { format: "srt", cues: [...exampleTranslationCues] },
  serverCacheWith(
    "getSubtitleCues",
    { ...file, trackId: "t1" },
    { format: "srt", cues: [...exampleCues] },
    serverCacheWith("listSubtitleTracks", file, tracks, withFlashcardSources),
  ),
);
