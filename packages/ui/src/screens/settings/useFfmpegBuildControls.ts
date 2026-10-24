import {
  actions,
  selectBundledServerPlatform,
  selectFfmpegBuildChoice,
} from "@easyimmerse/state";
import { useConversionCapabilities } from "../../lib/useConversionCapabilities.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import type { FfmpegBuildControls } from "./FfmpegBuildBlock.tsx";

/** Reads the desktop app's ffmpeg build and video encoder, and chooses another build on request. Returns null outside the desktop app. */
export function useFfmpegBuildControls(): FfmpegBuildControls | null {
  const dispatch = useAppDispatch();
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const { data: capabilities, error } = useConversionCapabilities(!isDesktop);
  const choice = useAppSelector(selectFfmpegBuildChoice);
  if (!isDesktop) return null;
  return {
    capabilities:
      capabilities !== undefined
        ? { kind: "loaded", capabilities }
        : error !== undefined
          ? { kind: "failed", message: messageOf(error) }
          : { kind: "loading" },
    choice,
    onChoose: () => dispatch(actions.ffmpegBuildPickRequested()),
    onUseBundled: () => dispatch(actions.bundledFfmpegBuildChosen()),
  };
}

function messageOf(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "The server did not answer.";
}
