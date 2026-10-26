import { useListUsersQuery } from "@easyimmerse/backend";
import {
  type AccountVia,
  actions,
  selectUserChangeFailureMessage,
  selectUserPage,
  selectUserSearch,
} from "@easyimmerse/state";
import type { UsersPage } from "@easyimmerse/types";
import { useId } from "react";
import { TextField } from "../../components/common/TextField.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { accountsCountText } from "./accountsCountText.ts";
import { UserRow } from "./UserRow.tsx";
import { UsersPager } from "./UsersPager.tsx";

/** The accounts of the server that `via` names, a page at a time, with a field that searches them by email address, one row each. */
export function UserList({ via }: { via: AccountVia }) {
  const headingId = useId();
  const search = useAppSelector(selectUserSearch).trim();
  const page = useAppSelector(selectUserPage);
  const users = useListUsersQuery({ via, search, page });
  const listed = users.currentData;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-sm font-semibold">
        Accounts
      </h2>
      {users.isError ? (
        <p role="alert" className="text-sm text-danger-fg">
          The server's accounts could not be listed.
        </p>
      ) : listed?.total === 0 && search === "" ? (
        <p className="text-sm text-fg-muted">
          This server has no accounts yet.
        </p>
      ) : (
        <>
          <SearchField />
          {listed === undefined ? (
            <p className="text-sm text-fg-muted">Listing the accounts…</p>
          ) : (
            <ListedUsers via={via} listed={listed} />
          )}
        </>
      )}
    </section>
  );
}

function SearchField() {
  const dispatch = useAppDispatch();
  return (
    <TextField
      label="Search by email"
      type="search"
      autoComplete="off"
      className="max-w-sm"
      value={useAppSelector(selectUserSearch)}
      onChange={(event) =>
        dispatch(actions.userSearchChanged(event.target.value))
      }
    />
  );
}

/** One page of the accounts that match the search, with how many match, why the last change failed, and the buttons that turn the page. */
function ListedUsers({ via, listed }: { via: AccountVia; listed: UsersPage }) {
  const search = useAppSelector(selectUserSearch).trim();
  const page = useAppSelector(selectUserPage);
  const changeFailure = useAppSelector(selectUserChangeFailureMessage);
  return (
    <>
      <p className="text-xs text-fg-muted" aria-live="polite">
        {accountsCountText(listed, page, search)}
      </p>
      {changeFailure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {changeFailure}
        </p>
      )}
      {listed.users.length > 0 && (
        <ul
          aria-label="Accounts"
          className="flex max-w-lg flex-col divide-y divide-line"
        >
          {listed.users.map((user) => (
            <UserRow key={user.id} via={via} user={user} />
          ))}
        </ul>
      )}
      <UsersPager page={page} total={listed.total} />
    </>
  );
}
