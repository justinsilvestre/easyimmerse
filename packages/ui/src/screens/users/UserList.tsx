import { useListUsersQuery } from "@easyimmerse/backend";
import {
  type AccountVia,
  actions,
  selectUserChangeFailureMessage,
  selectUserSearch,
} from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import { useId } from "react";
import { TextField } from "../../components/common/TextField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { UserRow } from "./UserRow.tsx";
import { usersMatching } from "./usersMatching.ts";

/** The accounts of the server that `via` names, with a field that filters them by email address, one row each. */
export function UserList({ via }: { via: AccountVia }) {
  const headingId = useId();
  const users = useListUsersQuery(via);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-sm font-semibold">
        Accounts
      </h2>
      {users.isError ? (
        <p role="alert" className="text-sm text-danger-fg">
          The server's accounts could not be listed.
        </p>
      ) : users.data === undefined ? (
        <p className="text-sm text-fg-muted">Listing the accounts…</p>
      ) : users.data.length === 0 ? (
        <p className="text-sm text-fg-muted">
          This server has no accounts yet.
        </p>
      ) : (
        <SearchedUsers via={via} users={users.data} />
      )}
    </section>
  );
}

function SearchedUsers({
  via,
  users,
}: {
  via: AccountVia;
  users: readonly AccountUser[];
}) {
  const dispatch = useAppDispatch();
  const search = useAppSelector(selectUserSearch);
  const changeFailure = useAppSelector(selectUserChangeFailureMessage);
  const matching = usersMatching(users, search);
  return (
    <>
      <TextField
        label="Search by email"
        type="search"
        autoComplete="off"
        className="max-w-sm"
        value={search}
        onChange={(event) =>
          dispatch(actions.userSearchChanged(event.target.value))
        }
      />
      <p className="text-xs text-fg-muted" aria-live="polite">
        {countText(matching.length, users.length, search)}
      </p>
      {changeFailure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {changeFailure}
        </p>
      )}
      {matching.length > 0 && (
        <ul
          aria-label="Accounts"
          className="flex max-w-lg flex-col divide-y divide-line"
        >
          {matching.map((user) => (
            <UserRow key={user.id} via={via} user={user} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Tells how many accounts there are, and while a search filters them, how many of them match it. */
function countText(matchCount: number, total: number, search: string) {
  const accounts = total === 1 ? "1 account" : `${total} accounts`;
  if (search.trim() === "") return accounts;
  if (matchCount === 0)
    return `No email address among the ${accounts} contains “${search.trim()}”.`;
  return `Showing ${matchCount} of ${accounts}.`;
}
