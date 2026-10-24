import {
  type AccountVia,
  actions,
  selectDeletionToConfirm,
  selectUserChangeInFlight,
  type UserAccess,
} from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import { Trash2 } from "lucide-react";
import { Button } from "../../components/common/Button.tsx";
import { MenuButton } from "../../components/common/MenuButton.tsx";
import type { MenuItem } from "../../components/common/MenuItemButton.tsx";
import { accountAccessSummary } from "../../lib/accountAccessSummary.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";

/**
 * One account: its email address, a summary of what it may do, and a menu of checkboxes for Server admin, Library admin and Full access,
 * with a Delete item that asks for confirmation first.
 */
export function UserRow({ via, user }: { via: AccountVia; user: AccountUser }) {
  const change = useAppSelector((state) =>
    selectUserChangeInFlight(state, user.id),
  );
  const isConfirming = useAppSelector(selectDeletionToConfirm) === user.id;
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="break-all text-sm">{user.email}</span>
          <span className="text-xs text-fg-muted">
            {accountAccessSummary(user)}
            {change !== null &&
              (change === "deleteUser" ? " · Deleting…" : " · Saving…")}
          </span>
        </div>
        <UserMenu
          via={via}
          user={user}
          isBusy={change !== null || isConfirming}
        />
      </div>
      {isConfirming && <DeletionConfirmation via={via} email={user.email} />}
    </li>
  );
}

/** The menu of an account's access. A server admin always has the other two, so their boxes stay checked while Server admin is. */
function UserMenu({
  via,
  user,
  isBusy,
}: {
  via: AccountVia;
  user: AccountUser;
  isBusy: boolean;
}) {
  const dispatch = useAppDispatch();
  const isAdministrator = user.role === "administrator";
  const toggle = (access: UserAccess) => () =>
    dispatch(actions.userAccessToggled(via, user, access));
  const items: MenuItem[] = [
    {
      label: "Server admin",
      isChecked: isAdministrator,
      isDisabled: isBusy,
      onSelect: toggle("serverAdmin"),
    },
    {
      label: "Library admin",
      isChecked: isAdministrator || user.manages_library,
      isDisabled: isBusy || isAdministrator,
      onSelect: toggle("libraryAdmin"),
    },
    {
      label: "Full access",
      isChecked: isAdministrator || user.role === "privileged",
      isDisabled: isBusy || isAdministrator,
      onSelect: toggle("fullAccess"),
    },
    {
      label: "Delete",
      icon: <Trash2 className="size-4" aria-hidden />,
      isDestructive: true,
      isDisabled: isBusy,
      onSelect: () => dispatch(actions.userDeletionAsked(user.id)),
    },
  ];
  return (
    <MenuButton
      label={`Manage ${user.email}`}
      items={items}
      heading={
        isAdministrator
          ? "A server admin is always a library admin and has full access."
          : undefined
      }
    />
  );
}

function DeletionConfirmation({
  via,
  email,
}: {
  via: AccountVia;
  email: string;
}) {
  const dispatch = useAppDispatch();
  return (
    <fieldset
      aria-label={`Delete ${email}?`}
      className="flex flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <p className="flex-1">
        Delete {email}? Anyone using this account will be logged out.
      </p>
      <Button
        size="sm"
        variant="danger"
        onClick={() => dispatch(actions.userDeletionConfirmed(via))}
      >
        Delete account
      </Button>
      <Button
        size="sm"
        onClick={() => dispatch(actions.userDeletionCancelled())}
      >
        Keep
      </Button>
    </fieldset>
  );
}
