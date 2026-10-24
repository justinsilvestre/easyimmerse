import { actions, selectIsSettingsOpen } from "@easyimmerse/state";
import clsx from "clsx";
import type { MouseEvent, ReactNode, RefObject } from "react";
import { ThemeChoiceControl } from "../components/ThemeChoiceControl.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { capitalized } from "./capitalized.ts";
import type { ProfileAccount } from "./useProfileAccount.ts";

/** The open Profile menu: who the app is logged in as, the way to the account or to logging in, the theme choice, and Settings. */
export function ProfilePanel({
  account,
  onClose,
  ...panelProps
}: {
  ref: RefObject<HTMLDivElement | null>;
  id: string;
  onMouseDown: (event: MouseEvent) => void;
  account: ProfileAccount;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const isSettingsOpen = useAppSelector(selectIsSettingsOpen);
  const go = (step: Parameters<typeof actions.navigated>[0]) => {
    onClose();
    dispatch(actions.navigated(step));
  };
  return (
    <div
      {...panelProps}
      role="dialog"
      aria-label="Profile"
      className="absolute top-full right-0 z-20 mt-1 flex w-72 max-w-[calc(100vw-1rem)] flex-col rounded-md border border-line bg-surface text-sm text-fg shadow-lg"
    >
      <AccountLines account={account} />
      <div className="border-b border-line py-1">
        <Row onClick={() => go({ type: "openAccountSettings" })}>
          {account.kind === "loggedOut" ? "Log in or sign up" : "Account"}
        </Row>
      </div>
      <div className="py-1">
        <div className="flex items-center justify-between gap-3 px-3 py-1.5">
          <span aria-hidden>Theme</span>
          <ThemeChoiceControl size="sm" />
        </div>
        <Row
          isCurrent={isSettingsOpen}
          onClick={() =>
            isSettingsOpen ? onClose() : go({ type: "openSettings" })
          }
        >
          Settings
        </Row>
      </div>
    </div>
  );
}

function AccountLines({ account }: { account: ProfileAccount }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line px-3 py-2">
      {account.kind === "loggedIn" ? (
        <>
          {account.email && <p className="break-all">{account.email}</p>}
          <p className="text-fg-muted">{capitalized(account.serverName)}</p>
        </>
      ) : (
        <p className="text-fg-muted">
          {account.kind === "loggedOut"
            ? "Not logged in"
            : "Checking which account this app uses…"}
        </p>
      )}
    </div>
  );
}

function Row({
  isCurrent = false,
  onClick,
  children,
}: {
  isCurrent?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={isCurrent ? "page" : undefined}
      onClick={onClick}
      className={clsx(
        "flex w-full items-center px-3 py-1.5 text-left hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        isCurrent && "font-medium text-accent-fg",
      )}
    >
      {children}
    </button>
  );
}
