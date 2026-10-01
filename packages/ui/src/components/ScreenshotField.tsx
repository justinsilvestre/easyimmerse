import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { Button } from "./Button.tsx";

/** Shows the captured video frame, or offers to capture the frame currently on screen. */
export function ScreenshotField({ value }: { value: string }) {
  const dispatch = useAppDispatch();
  const capture = () => dispatch(actions.frameCaptureRequested());
  if (!value.startsWith("data:"))
    return (
      <Button className="self-start" onClick={capture}>
        Capture current frame
      </Button>
    );
  return (
    <div className="flex flex-col items-start gap-2">
      <img
        src={value}
        alt="Screenshot"
        className="max-h-48 rounded border border-line"
      />
      <Button onClick={capture}>Capture again</Button>
    </div>
  );
}
