import type { AccountUser } from "@easyimmerse/types";

/** Returns the accounts whose email address contains the search, ignoring case and the spaces around it; every account when it is empty. */
export function usersMatching(
  users: readonly AccountUser[],
  search: string,
): readonly AccountUser[] {
  const needle = search.trim().toLowerCase();
  if (needle === "") return users;
  return users.filter((user) => user.email.toLowerCase().includes(needle));
}
