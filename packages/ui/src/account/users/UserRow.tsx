import {
  actions,
  selectDeletionToConfirm,
  selectUserChangeInFlight,
} from "@easyimmerse/state";
import type { AccountRole, AccountUser } from "@easyimmerse/types";
import { Button } from "../../components/Button.tsx";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { useAppSelector } from "../../hooks/useAppSelector.ts";
import { roleOptions } from "./roleOptions.ts";

/** One account, with a select that changes its role and a Delete button that asks for confirmation first. */
export function UserRow({ user }: { user: AccountUser }) {
  const dispatch = useAppDispatch();
  const change = useAppSelector((state) =>
    selectUserChangeInFlight(state, user.id),
  );
  const isChanging = change !== null;
  const isConfirming = useAppSelector(selectDeletionToConfirm) === user.id;
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 break-all text-sm">
          {user.email}
          {change === "setUserRole" && (
            <span className="text-fg-muted"> (changing its role…)</span>
          )}
        </span>
        <select
          aria-label={`Role of ${user.email}`}
          value={user.role}
          disabled={isChanging}
          onChange={(event) =>
            dispatch(
              actions.userRoleChosen(
                user.id,
                event.target.value as AccountRole,
              ),
            )
          }
          className="rounded-md border border-line-strong bg-surface px-2 py-1 text-sm text-fg focus:border-accent focus:outline-2 focus:outline-accent/30 disabled:opacity-50"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="danger"
          aria-label={`${change === "deleteUser" ? "Deleting" : "Delete"} ${user.email}`}
          aria-disabled={isChanging || isConfirming || undefined}
          onClick={() => {
            if (!isChanging) dispatch(actions.userDeletionAsked(user.id));
          }}
        >
          {change === "deleteUser" ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {isConfirming && <DeletionConfirmation email={user.email} />}
    </li>
  );
}

function DeletionConfirmation({ email }: { email: string }) {
  const dispatch = useAppDispatch();
  return (
    <fieldset
      aria-label={`Delete ${email}?`}
      className="flex flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <p className="flex-1">
        Delete {email}? Anyone logged in to this account is logged out.
      </p>
      <Button
        size="sm"
        variant="danger"
        onClick={() => dispatch(actions.userDeletionConfirmed())}
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
