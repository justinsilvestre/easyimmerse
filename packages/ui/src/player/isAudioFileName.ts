const audioExtensions: readonly string[] = [
  ".mp3",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".oga",
  ".opus",
  ".wav",
];

/** Guesses from the name whether a file holds only sound, for files the server has not probed. */
export function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return audioExtensions.some((extension) => lower.endsWith(extension));
}
