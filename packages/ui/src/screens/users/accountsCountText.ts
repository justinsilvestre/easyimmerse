import { usersPageSize } from "@easyimmerse/backend";
import type { UsersPage } from "@easyimmerse/types";

/**
 * Tells how many accounts match the search, or how many there are while it is blank,
 * and which of them the page shows once they fill more than one page. `page` counts from zero.
 */
export function accountsCountText(
  listed: UsersPage,
  page: number,
  search: string,
) {
  const { users, total } = listed;
  if (search !== "" && total === 0)
    return `No account's email address contains “${search}”.`;
  if (page === 0 && total <= usersPageSize) return wholeCount(total, search);
  if (users.length === 0) return "This page has no accounts left.";
  const first = page * usersPageSize + 1;
  const range = `${first}–${first + users.length - 1} of ${total}`;
  return search === "" ? `Accounts ${range}.` : `Matching accounts ${range}.`;
}

function wholeCount(total: number, search: string) {
  const accounts = total === 1 ? "1 account" : `${total} accounts`;
  if (search === "") return accounts;
  return total === 1 ? "1 account matches." : `${accounts} match.`;
}
