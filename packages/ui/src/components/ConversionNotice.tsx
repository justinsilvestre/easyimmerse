import { useEffect, useId, useRef, useState } from "react";
import { useDocumentListener } from "../hooks/useDocumentListener.ts";
import { useFocusTrap } from "../hooks/useFocusTrap.ts";
import { Button } from "./Button.tsx";
import { CheckboxField } from "./CheckboxField.tsx";

/**
 * Tells the user that a file will be converted while it plays, in a modal dialog that keeps keyboard focus inside it.
 * Play reports whether the user asked not to see the notice again, and Escape cancels.
 */
export function ConversionNotice({
  onPlay,
  onCancel,
}: {
  onPlay: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  useEffect(() => playButton.current?.focus(), []);
  useFocusTrap(panel);
  useDocumentListener("keydown", (event) => {
    if (event.key === "Escape") onCancel();
  });
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-gray-900/40 dark:bg-black/70 sm:items-center sm:p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="flex w-full flex-col rounded-t-xl bg-surface text-fg shadow-xl sm:max-w-md sm:rounded-xl"
      >
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
          <h2 id={titleId} className="text-lg font-semibold">
            This file will be converted as it plays
          </h2>
          <p id={bodyId} className="text-sm text-fg-soft">
            Your system can't play this file's format directly, so easyImmerse
            converts it while you watch. You can start right away and jump to
            any point.
          </p>
          <CheckboxField
            label="Don't show this again"
            checked={dontShowAgain}
            onChange={setDontShowAgain}
          />
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:min-h-11 sm:flex sm:justify-end sm:pb-3 sm:*:min-h-0">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            ref={playButton}
            variant="primary"
            onClick={() => onPlay(dontShowAgain)}
          >
            Play
          </Button>
        </footer>
      </div>
    </div>
  );
}
