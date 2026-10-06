import type { MediaSourceJob, MediaSourceLogLine } from "@easyimmerse/types";

const startedAtMs = 1767225600000;

function line(
  secondsIn: number,
  level: MediaSourceLogLine["level"],
  message: string,
): MediaSourceLogLine {
  return { at_ms: startedAtMs + secondsIn * 1000, level, message };
}

/** A fetch through the YouTube plugin, halfway through its download. */
export const exampleRunningJob: MediaSourceJob = {
  id: "job-1",
  project_id: "p1",
  plugin: "youtube-media-source",
  locator: "https://www.youtube.com/watch?v=abc123def45",
  status: "running",
  progress: { fraction: 0.45, message: "downloading the video and subtitles" },
  log: [
    line(0, "info", "yt-dlp 2026.08.19"),
    line(0, "info", "reading the video's description"),
    line(2, "info", "fetching subtitles in en, ja-orig"),
    line(2, "info", "downloading the video and subtitles"),
    line(
      2,
      "info",
      'running youtube --no-playlist -f "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b" …',
    ),
    line(
      3,
      "output",
      "[download]  12.5% of   48.21MiB at    3.10MiB/s ETA 00:13",
    ),
    line(
      4,
      "output",
      "[download]  31.9% of   48.21MiB at    3.25MiB/s ETA 00:10",
    ),
    line(
      5,
      "output",
      "[download]  45.0% of   48.21MiB at    3.30MiB/s ETA 00:08",
    ),
  ],
  media_file: null,
  error: null,
  started_at_ms: startedAtMs,
  finished_at_ms: null,
};

/** The same fetch, failed because the video is private. */
export const exampleFailedJob: MediaSourceJob = {
  ...exampleRunningJob,
  id: "job-2",
  status: "failed",
  progress: { fraction: 0, message: "reading the video's description" },
  log: [
    line(0, "info", "yt-dlp 2026.08.19"),
    line(0, "info", "reading the video's description"),
    line(0, "info", "running youtube --no-playlist --skip-download …"),
    line(
      1,
      "output",
      "ERROR: [youtube] abc123def45: Private video. Sign in if you've been granted access to this video",
    ),
    line(1, "warn", "youtube finished with exit code 1 after 1.2 s"),
    line(
      1,
      "error",
      "ERROR: [youtube] abc123def45: Private video. Sign in if you've been granted access to this video",
    ),
  ],
  error: {
    code: "media_source_failed",
    message:
      "ERROR: [youtube] abc123def45: Private video. Sign in if you've been granted access to this video",
  },
  finished_at_ms: startedAtMs + 1200,
};
