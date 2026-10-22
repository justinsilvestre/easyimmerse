import type { FfmpegBuildChoiceView } from "@easyimmerse/state";
import type {
  ConversionCapabilities,
  FfmpegBuild,
  VideoEncoder,
} from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { FfmpegGuidance } from "./FfmpegGuidance.tsx";

/** What is known about the server's media conversion: still being asked, unknown because the question failed, or known. */
export type ConversionCapabilitiesView =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "loaded"; capabilities: ConversionCapabilities };

/** The desktop app's ffmpeg build as the media conversion settings show it, and how another is chosen. */
export type FfmpegBuildControls = {
  capabilities: ConversionCapabilitiesView;
  choice: FfmpegBuildChoiceView;
  onChoose: () => void;
  onUseBundled: () => void;
};

/**
 * Which ffmpeg build converts media and which video encoder it found, with buttons to choose another build or go back to the bundled one.
 * When no encoder works, it explains how to get a build that has one.
 */
export function FfmpegBuildBlock(controls: FfmpegBuildControls) {
  const { capabilities } = controls;
  switch (capabilities.kind) {
    case "loading":
      return (
        <p className="text-sm text-fg-muted">Checking the ffmpeg build…</p>
      );
    case "failed":
      return (
        <p role="alert" className="text-sm text-danger-fg">
          The ffmpeg build could not be checked: {capabilities.message}
        </p>
      );
    case "loaded":
      return (
        <LoadedBuild {...controls} capabilities={capabilities.capabilities} />
      );
  }
}

function LoadedBuild({
  capabilities,
  choice,
  onChoose,
  onUseBundled,
}: Omit<FfmpegBuildControls, "capabilities"> & {
  capabilities: ConversionCapabilities;
}) {
  const { ffmpeg } = capabilities;
  const needsGuidance =
    ffmpeg === null ||
    (capabilities.encoder_discovery_finished &&
      capabilities.video_encoder === null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        <BuildLine ffmpeg={ffmpeg} />
        {ffmpeg !== null && <EncoderLine capabilities={capabilities} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-disabled={!choice.canChoose}
          onClick={choice.canChoose ? onChoose : undefined}
        >
          Choose an ffmpeg build
        </Button>
        {ffmpeg?.is_custom && (
          <Button
            variant="subtle"
            aria-disabled={!choice.canChoose}
            onClick={choice.canChoose ? onUseBundled : undefined}
          >
            Use the bundled build
          </Button>
        )}
        {choice.isSaving && (
          <p role="status" className="text-sm text-fg-muted">
            Restarting the server with the build…
          </p>
        )}
      </div>
      {choice.failure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {choice.failure}
        </p>
      )}
      {needsGuidance && <FfmpegGuidance />}
    </div>
  );
}

function BuildLine({ ffmpeg }: { ffmpeg: FfmpegBuild | null }) {
  if (ffmpeg === null)
    return (
      <p>No ffmpeg build was found, so media conversion is unavailable.</p>
    );
  return ffmpeg.is_custom ? (
    <p>
      In use: the ffmpeg build at{" "}
      <span className="font-mono break-all">{ffmpeg.path}</span>, version{" "}
      {ffmpeg.version}.
    </p>
  ) : (
    <p>In use: the bundled ffmpeg build, version {ffmpeg.version}.</p>
  );
}

function EncoderLine({
  capabilities,
}: {
  capabilities: ConversionCapabilities;
}) {
  if (!capabilities.encoder_discovery_finished)
    return (
      <p role="status" className="text-fg-muted">
        Looking for a video encoder…
      </p>
    );
  const encoder: VideoEncoder | null = capabilities.video_encoder;
  if (encoder === null)
    return <p className="text-warning-fg">No usable video encoder.</p>;
  return (
    <p>
      Video encoder: <span className="font-mono">{encoder.name}</span> (
      {encoder.software ? "software" : "hardware"}).
    </p>
  );
}
