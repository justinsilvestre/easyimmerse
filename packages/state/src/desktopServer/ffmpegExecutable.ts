/** The file names an ffmpeg executable has: without an extension, or with `.exe` on Windows. */
const ffmpegFileNames = ["ffmpeg", "ffmpeg.exe"];

/** Returns the directory that holds the file at the path, accepting both slash and backslash separators. */
export function directoryOf(path: string): string {
  const end = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return end <= 0 ? path.slice(0, end + 1) : path.slice(0, end);
}

/** Tells whether the path names an ffmpeg executable. */
export function isFfmpegExecutable(path: string): boolean {
  const name = path.slice(directoryOf(path).length).replace(/^[/\\]/, "");
  return ffmpegFileNames.includes(name.toLowerCase());
}
