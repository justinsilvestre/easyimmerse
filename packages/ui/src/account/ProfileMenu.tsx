import { UserRound } from "lucide-react";
import { IconButton } from "../components/IconButton.tsx";
import { MenuShell } from "../components/MenuShell.tsx";
import { ProfilePanel } from "./ProfilePanel.tsx";
import { useProfileAccount } from "./useProfileAccount.ts";

/**
 * The Profile button at the right of the header, which shows the first letter of the account's email address while logged in, and a person icon otherwise.
 * It opens a panel below it, aligned to its right edge, with the account, the theme choice, and the way to Settings.
 * With `isInitiallyOpen`, the panel starts open.
 */
export function ProfileMenu({
  isInitiallyOpen = false,
}: {
  isInitiallyOpen?: boolean;
}) {
  const account = useProfileAccount();
  const email = account.kind === "loggedIn" ? account.email : null;
  return (
    <MenuShell
      popup="dialog"
      className="shrink-0"
      isInitiallyOpen={isInitiallyOpen}
      trigger={(triggerProps) => (
        <IconButton label="Profile" {...triggerProps}>
          {email ? (
            <span
              aria-hidden
              className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent"
            >
              {email.charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserRound aria-hidden className="size-4" />
          )}
        </IconButton>
      )}
      menu={({ close, ...panelProps }) => (
        <ProfilePanel {...panelProps} account={account} onClose={close} />
      )}
    />
  );
}
