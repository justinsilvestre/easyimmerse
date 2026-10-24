import { actions, selectPreference } from "@easyimmerse/state";
import type { VideoQuality } from "@easyimmerse/types";
import { PreferenceToggle } from "../components/PreferenceToggle.tsx";
import { SelectField } from "../components/SelectField.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import {
  FfmpegBuildBlock,
  type FfmpegBuildControls,
} from "./FfmpegBuildBlock.tsx";

/** The id of the Media conversion section's heading, which labels the section and which links to the section name. */
export const mediaConversionSectionId = "settings-media-conversion";

const qualityOptions = [
  { value: "compact", label: "Smaller files" },
  { value: "balanced", label: "Balanced" },
  { value: "best", label: "Best picture" },
] as const satisfies readonly { value: VideoQuality; label: string }[];

/**
 * How media is converted: whether audio stays lossless, the quality of converted video, and on the desktop app the ffmpeg build.
 * Opened for this section, Settings scroll to it.
 */
export function MediaConversionSection({
  ffmpegBuild,
  isScrollTarget = false,
}: {
  /** The desktop app's ffmpeg build, or null where the app has none to choose. */
  ffmpegBuild: FfmpegBuildControls | null;
  isScrollTarget?: boolean;
}) {
  return (
    <section
      ref={isScrollTarget ? scrollIntoView : undefined}
      aria-labelledby={mediaConversionSectionId}
      className="flex scroll-mt-4 flex-col gap-3"
    >
      <h3 id={mediaConversionSectionId} className="text-base font-semibold">
        Media conversion
      </h3>
      <PreferenceToggle
        preferenceKey="losslessAudio"
        label="Keep audio lossless when converting"
        hint="Converted audio keeps its full quality but takes more disk space."
      />
      <VideoQualitySelect />
      {ffmpegBuild !== null && <FfmpegBuildBlock {...ffmpegBuild} />}
    </section>
  );
}

function VideoQualitySelect() {
  const dispatch = useAppDispatch();
  const stored = useAppSelector(selectPreference("videoQuality"));
  const value =
    qualityOptions.find((option) => option.value === stored)?.value ??
    "balanced";
  return (
    <SelectField
      label="Quality of converted video"
      className="max-w-xs"
      value={value}
      options={qualityOptions}
      hint="Higher quality makes converted video take more space in the media cache."
      onChange={(event) =>
        dispatch(actions.preferenceSet("videoQuality", event.target.value))
      }
    />
  );
}

/** Brings the section into view once it is first drawn. */
function scrollIntoView(element: HTMLElement | null) {
  element?.scrollIntoView?.({ block: "start" });
}
