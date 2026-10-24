import { actions, selectBundledServerPlatform } from "@easyimmerse/state";
import { AlertTriangle } from "lucide-react";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { Button } from "../common/Button.tsx";
import { playbackFailureHeading } from "./playbackFailure.ts";

/**
 * Tells the user that playback failed, and why, in plain words, and offers the way back to the project.
 * When no video encoder works, the desktop app also says how to get one and offers its Media conversion settings, where another ffmpeg build is chosen.
 * It is drawn over the black stage in both themes, so it uses palette colors.
 * The alert holds only the message, so a screen reader announces the failure without the button's label.
 */
export function PlayerFailure({
  cause,
  needsVideoEncoder = false,
}: {
  cause: string;
  needsVideoEncoder?: boolean;
}) {
  const dispatch = useAppDispatch();
  const isDesktop = useAppSelector(selectBundledServerPlatform) === "desktop";
  const offersSettings = needsVideoEncoder && isDesktop;
  return (
    <div className="flex max-w-md gap-3 rounded-lg bg-black/80 p-4 text-gray-200 shadow-lg">
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-red-300"
        aria-hidden
      />
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div role="alert" className="flex flex-col gap-1 text-sm">
          <p className="font-medium text-white">{playbackFailureHeading}</p>{" "}
          <p>{cause}</p>
          {offersSettings && (
            <p>
              {" "}
              Install an ffmpeg build with a software H.264 encoder and choose
              it in the Media conversion section of Settings.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="overVideo"
            onClick={() => dispatch(actions.closeMedia())}
          >
            Back to the project
          </Button>
          {offersSettings && (
            <Button
              size="sm"
              variant="overVideo"
              onClick={() =>
                dispatch(
                  actions.navigated({ type: "openMediaConversionSettings" }),
                )
              }
            >
              Open Media conversion settings
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
