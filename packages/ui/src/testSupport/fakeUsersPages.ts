import type { BackendRequest } from "@easyimmerse/backend";
import type { AccountUser, UsersPage } from "@easyimmerse/types";

/**
 * Answers `GET /users` as the server does for the given accounts:
 * those whose email address contains the `search` query in any letter case, `limit` of them after `offset`.
 */
export const fakeUsersPages =
  (users: readonly AccountUser[]) =>
  ({ query = {} }: BackendRequest): UsersPage => {
    const needle = (query.search ?? "").toLowerCase();
    const matching = users.filter((user) =>
      user.email.toLowerCase().includes(needle),
    );
    const offset = Number(query.offset ?? 0);
    const limit = Number(query.limit ?? 50);
    return {
      users: matching.slice(offset, offset + limit),
      total: matching.length,
    };
  };
