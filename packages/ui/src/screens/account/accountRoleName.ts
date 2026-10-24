import type { AccountRole } from "@easyimmerse/types";

const roleNames = {
  library_user: "library user",
  privileged: "privileged user",
  administrator: "administrator",
} satisfies Record<AccountRole, string>;

/** Names an account's role in words. */
export function accountRoleName(role: AccountRole): string {
  return roleNames[role];
}
