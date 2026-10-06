import { actions } from "@easyimmerse/state";
import { AlertTriangle } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { playbackFailureHeading } from "./playbackFailure.ts";

/**
 * Tells the user that playback failed, and why, in plain words, and offers the way back to the project.
 * It is drawn over the black stage in both themes, so it uses palette colors.
 * The alert holds only the message, so a screen reader announces the failure without the button's label.
 */
export function PlayerFailure({ cause }: { cause: string }) {
  const dispatch = useAppDispatch();
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
        </div>
        <Button
          size="sm"
          className="border-gray-600 bg-black/50 text-white hover:bg-gray-800"
          onClick={() => dispatch(actions.closeMedia())}
        >
          Back to the project
        </Button>
      </div>
    </div>
  );
}
