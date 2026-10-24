import type { CaptureManifest } from "./captureManifest.ts";

/** Lists each story of a capture that failed to render, as `<title> / <name>: <error>`. */
export function renderErrors(manifest: CaptureManifest): string[] {
  return manifest.stories.flatMap((story) =>
    story.error === undefined
      ? []
      : [`${story.title} / ${story.name}: ${story.error}`],
  );
}
