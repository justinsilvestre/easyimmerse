import { useListProjectsQuery } from "@easyimmerse/backend";
import { actions, selectBackupSign, selectWorkHome } from "@easyimmerse/state";
import { CloudOff } from "lucide-react";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { backupSignTexts } from "./backupSignTexts.ts";

/**
 * A quiet sign in the footer while some of the user's work is kept only on this device,
 * which opens an explanation of how the work could be lost and, where the app offers one, a way to back it up.
 * On a narrow screen it shows only its icon.
 */
export function NotBackedUpSign() {
  const isOnBuiltInServer = useAppSelector(selectWorkHome) === "builtInServer";
  // Keeps the project list cached, since whether each project is backed up decides the sign.
  useListProjectsQuery(undefined, { skip: !isOnBuiltInServer });
  const texts = backupSignTexts(useAppSelector(selectBackupSign));
  const dispatch = useAppDispatch();
  const explanationId = useId();
  if (texts === null) return null;
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
            {texts.explanation}
          </p>
          {texts.offersLogIn && (
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
          )}
        </div>
      )}
    />
  );
}
