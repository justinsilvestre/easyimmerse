import {
  useGetSyncStatusQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { selectBackupSign, selectWorkHome } from "@easyimmerse/state";
import { CloudOff } from "lucide-react";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { backupSignTexts } from "./backupSignTexts.ts";

/** How often the sign asks the built-in server how syncing with its remote fares. */
const syncStatusPollMs = 5000;

/**
 * A quiet sign in the footer while some of the user's work is kept only on this device,
 * which opens an explanation of how the work could be lost and the ways of backing it up that the app offers.
 * On a narrow screen it shows only its icon. With `isInitiallyOpen`, the explanation starts open.
 */
export function NotBackedUpSign({
  isInitiallyOpen = false,
}: {
  isInitiallyOpen?: boolean;
}) {
  const isOnBuiltInServer = useAppSelector(selectWorkHome) === "builtInServer";
  // Keeps the project list and the sync status cached, since whether each project is backed up, and how the link to a remote fares, decide the sign.
  useListProjectsQuery(undefined, { skip: !isOnBuiltInServer });
  useGetSyncStatusQuery(undefined, {
    pollingInterval: syncStatusPollMs,
    skip: !isOnBuiltInServer,
  });
  const texts = backupSignTexts(useAppSelector(selectBackupSign));
  const dispatch = useAppDispatch();
  const explanationId = useId();
  if (texts === null) return null;
  const { explanation, options } = texts;
  return (
    // On a narrow screen the panel is placed against the footer rather than the sign, which sits too far right for it to fit.
    <MenuShell
      className="shrink-0 max-sm:static"
      isInitiallyOpen={isInitiallyOpen}
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
          className="absolute bottom-full left-0 z-20 mb-1 flex max-sm:left-2 w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-md border border-line bg-surface p-3 text-sm shadow-lg"
        >
          <p id={explanationId} className="text-fg-muted">
            {explanation}
          </p>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option.label}
                  size="sm"
                  role="menuitem"
                  onClick={() => {
                    close();
                    for (const action of option.actions) dispatch(action);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    />
  );
}
