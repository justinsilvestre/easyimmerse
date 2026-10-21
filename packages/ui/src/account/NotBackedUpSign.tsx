import { actions, selectIsWorkNotBackedUp } from "@easyimmerse/state";
import { CloudOff } from "lucide-react";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/**
 * A quiet sign in the footer while the user's work is kept only on this device, which opens an explanation with a way to log in.
 * On a narrow screen it shows only its icon.
 */
export function NotBackedUpSign() {
  const isNotBackedUp = useAppSelector(selectIsWorkNotBackedUp);
  const dispatch = useAppDispatch();
  const explanationId = useId();
  if (!isNotBackedUp) return null;
  return (
    <MenuShell
      className="shrink-0"
      trigger={(triggerProps) => (
        <button
          type="button"
          aria-label="Not backed up"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          {...triggerProps}
        >
          <CloudOff aria-hidden className="size-3.5 text-warning-fg" />
          <span className="hidden sm:inline">Not backed up</span>
        </button>
      )}
      menu={({ close, ...menuProps }) => (
        <div
          {...menuProps}
          role="menu"
          aria-label="Not backed up"
          aria-describedby={explanationId}
          className="absolute bottom-full left-0 z-20 mb-1 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-md border border-line bg-surface p-3 text-sm shadow-lg"
        >
          <p id={explanationId} className="text-fg-muted">
            Your flashcards aren't backed up. They're stored only in this
            browser, so you'll lose them if its data is cleared.
          </p>
          <Button
            size="sm"
            role="menuitem"
            className="self-start"
            onClick={() => {
              close();
              dispatch(actions.navigated({ type: "openAccountSettings" }));
            }}
          >
            Log in or sign up
          </Button>
        </div>
      )}
    />
  );
}
