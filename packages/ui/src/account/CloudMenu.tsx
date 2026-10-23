import {
  useGetSyncStatusQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { actions, selectBackupSign, selectWorkHome } from "@easyimmerse/state";
import clsx from "clsx";
import { Cloud, CloudOff, UserRound, Wifi } from "lucide-react";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuItemButton } from "../components/MenuItemButton.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { backupSignTexts } from "./backupSignTexts.ts";

/** How often the menu asks the built-in server how syncing with its remote fares. */
const syncStatusPollMs = 5000;

const plainLabel = "Backup and sync";
const warningLabel = "Not backed up";

/**
 * The cloud button in the footer, which opens a menu of the ways to reach other devices: local network sync and the account settings.
 * While some of the user's work is kept only on this device, the button is a quiet sign that the work is not backed up,
 * and the menu first explains how the work could be lost and offers the ways of backing it up that the app has.
 * On a narrow screen the sign shows only its icon. With `isInitiallyOpen`, the menu starts open.
 */
export function CloudMenu({
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
  return (
    // On a narrow screen the menu is placed against the footer rather than the button, which may sit too far right for it to fit.
    <MenuShell
      className="shrink-0 max-sm:static"
      isInitiallyOpen={isInitiallyOpen}
      trigger={(triggerProps) =>
        texts === null ? (
          <IconButton label={plainLabel} {...triggerProps}>
            <Cloud aria-hidden className="size-4" />
          </IconButton>
        ) : (
          <button
            type="button"
            aria-label={warningLabel}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            {...triggerProps}
          >
            <CloudOff aria-hidden className="size-3.5 text-warning-fg" />
            <span className="hidden sm:inline">{warningLabel}</span>
          </button>
        )
      }
      menu={({ close, ...menuProps }) => (
        <div
          {...menuProps}
          role="menu"
          aria-label={texts === null ? plainLabel : warningLabel}
          aria-describedby={texts === null ? undefined : explanationId}
          className={clsx(
            "absolute bottom-full left-0 z-20 mb-1 flex max-sm:left-2 max-w-[calc(100vw-1rem)] flex-col rounded-md border border-line bg-surface py-1 text-sm shadow-lg",
            texts === null ? "min-w-48" : "w-72",
          )}
        >
          {texts !== null && (
            <div className="flex flex-col gap-2 border-b border-line px-3 pt-2 pb-3">
              <p id={explanationId} className="text-fg-muted">
                {texts.explanation}
              </p>
              {texts.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {texts.options.map((option) => (
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
          <div className={texts === null ? undefined : "pt-1"}>
            <MenuItemButton
              item={{
                label: "Local network sync",
                icon: <Wifi aria-hidden className="size-4 text-fg-muted" />,
                onSelect: () =>
                  dispatch(actions.navigated({ type: "openPairing" })),
              }}
              onClose={close}
            />
            <MenuItemButton
              item={{
                label: "Account settings",
                icon: (
                  <UserRound aria-hidden className="size-4 text-fg-muted" />
                ),
                onSelect: () =>
                  dispatch(actions.navigated({ type: "openAccountSettings" })),
              }}
              onClose={close}
            />
          </div>
        </div>
      )}
    />
  );
}
