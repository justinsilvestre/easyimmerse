import type {
  ListMediaFilesResponse,
  MediaFile,
  PlaybackRequest,
  PlaybackResponse,
  TracksResponse,
} from "@easyimmerse/types";
import { actions } from "../../app/appAction.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { exampleEnvironment } from "./examplePlayback.ts";

/** Media file m1 of project p1 on the server's disk, with no saved track choice. */
export const fileOnDisk: MediaFile = exampleMediaFile("m1", "episode.mkv");

/** The settle of the media screen's request for the project's media files. */
export const mediaFilesListed = (file: MediaFile = fileOnDisk) => {
  const data: ListMediaFilesResponse = { media_files: [file] };
  return actions.requestSettled(
    "media/m1/mediaFile",
    { kind: "listMediaFiles", projectId: "p1" },
    { ok: true, data },
  );
};

/** The settle of the media screen's request for m1's tracks. */
export const tracksSettled = (data: TracksResponse) =>
  actions.requestSettled(
    "media/m1/tracks",
    { kind: "getMediaTracks", projectId: "p1", mediaFileId: "m1" },
    { ok: true, data },
  );

/** The browser's support measured for m1. */
export const environmentMeasured = actions.playbackEnvironmentMeasured(
  "m1",
  exampleEnvironment,
);

/** The plan request for m1 with the given selection and audio target. */
export const planRequestFor = (
  selection: PlaybackRequest["selection"],
  preferredAudioTarget: PlaybackRequest["preferred_audio_target"] = null,
) =>
  ({
    kind: "planPlayback",
    projectId: "p1",
    mediaFileId: "m1",
    request: {
      environment: exampleEnvironment,
      selection,
      preferred_audio_target: preferredAudioTarget,
    },
  }) as const;

/** The effect that sends the plan request for m1. */
export const planSent = (...args: Parameters<typeof planRequestFor>) => ({
  type: "sendRequest",
  id: "media/m1/playbackPlan",
  request: planRequestFor(...args),
});

/** The settle of m1's plan request, sent with no selection. */
export const planSettled = (data: PlaybackResponse) =>
  actions.requestSettled("media/m1/playbackPlan", planRequestFor(null), {
    ok: true,
    data,
  });
