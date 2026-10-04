import { playbackFailureHeading } from "./playbackFailure.ts";

/** Tells the user that playback failed, and why, in plain words. */
export function PlayerFailure({ cause }: { cause: string }) {
  return (
    <p
      role="alert"
      className="rounded bg-black/70 px-3 py-2 text-sm text-red-300"
    >
      {playbackFailureHeading} {cause}
    </p>
  );
}
