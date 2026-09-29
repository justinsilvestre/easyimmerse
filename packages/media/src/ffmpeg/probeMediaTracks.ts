import { runMediaTool } from "./runMediaTool.ts";

export type MediaTrack = {
  index: number;
  type: "video" | "audio" | "subtitle" | "other";
  codec: string;
  /** The language tag stored in the file for this track, if any. */
  language: string | null;
};

type ProbedStream = {
  index: number;
  codec_type?: string;
  codec_name?: string;
  tags?: { language?: string };
};

const probeArguments = ["-v", "error", "-show_streams", "-of", "json"];

/** Lists the video, audio, and subtitle tracks contained in a media file. */
export async function probeMediaTracks(
  filePath: string,
): Promise<MediaTrack[]> {
  const output = await runMediaTool("ffprobe", [...probeArguments, filePath]);
  const { streams }: { streams: ProbedStream[] } = JSON.parse(output);
  return streams.map(toMediaTrack);
}

function toMediaTrack(stream: ProbedStream): MediaTrack {
  return {
    index: stream.index,
    type: toTrackType(stream.codec_type),
    codec: stream.codec_name ?? "unknown",
    language: stream.tags?.language ?? null,
  };
}

function toTrackType(codecType: string | undefined): MediaTrack["type"] {
  const isKnownType =
    codecType === "video" || codecType === "audio" || codecType === "subtitle";
  return isKnownType ? codecType : "other";
}
