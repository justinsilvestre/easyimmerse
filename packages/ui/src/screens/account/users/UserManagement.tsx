import { useListUsersQuery } from "@easyimmerse/backend";
import {
  selectAccountVia,
  selectUserChangeFailureMessage,
} from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../../../useAppSelector.ts";
import { NewUserForm } from "./NewUserForm.tsx";
import { UserRow } from "./UserRow.tsx";

/** The server's accounts, for an administrator to change their roles, delete them, and create more. */
export function UserManagement() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-sm font-semibold">
        Users
      </h3>
      <UserList />
      <NewUserForm />
    </section>
  );
}

function UserList() {
  const users = useListUsersQuery(useAppSelector(selectAccountVia));
  const changeFailure = useAppSelector(selectUserChangeFailureMessage);
  if (users.isError)
    return (
      <p role="alert" className="text-sm text-danger-fg">
        The server's accounts could not be listed.
      </p>
    );
  if (users.data === undefined)
    return <p className="text-sm text-fg-muted">Listing the accounts…</p>;
  return (
    <>
      {changeFailure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {changeFailure}
        </p>
      )}
      {users.data.length === 0 ? (
        <p className="text-sm text-fg-muted">
          This server has no accounts yet.
        </p>
      ) : (
        <ul
          aria-label="Accounts"
          className="flex max-w-lg flex-col divide-y divide-line"
        >
          {users.data.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}
    </>
  );
}
