import type { MediaKind } from "@easyimmerse/types";

// Mirrors `media_kind_from_name` in crates/core/src/media_file.rs. A wasm round trip for a lookup table is not worth it.
const mediaKindsByExtension = new Map<string, MediaKind>([
  ...withKind("video", ["mp4", "m4v", "mkv", "webm", "mov", "avi"]),
  ...withKind("audio", [
    "mp3",
    "m4a",
    "m4b",
    "aac",
    "ogg",
    "oga",
    "opus",
    "flac",
    "wav",
  ]),
  ...withKind("document", ["epub", "txt", "md"]),
]);

/** Every file extension, without the dot, that names a kind of media. */
export const mediaExtensions: readonly string[] = [
  ...mediaKindsByExtension.keys(),
];

/** Guesses the kind of media from a file name's extension. Returns null for an unknown extension. */
export function guessMediaKind(name: string): MediaKind | null {
  const dot = name.lastIndexOf(".");
  if (dot === -1) return null;
  const extension = name.slice(dot + 1).toLowerCase();
  return mediaKindsByExtension.get(extension) ?? null;
}

function withKind(
  kind: MediaKind,
  extensions: readonly string[],
): [string, MediaKind][] {
  return extensions.map((extension) => [extension, kind]);
}
