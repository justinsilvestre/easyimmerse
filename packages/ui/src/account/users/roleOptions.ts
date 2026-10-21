import type { AccountRole } from "@easyimmerse/types";
import { accountRoleName } from "../accountRoleName.ts";

const roles = [
  "library_user",
  "privileged",
  "administrator",
] satisfies AccountRole[];

/** Every role an account may have, named in words, for a role select. */
export const roleOptions = roles.map((role) => ({
  value: role,
  label: accountRoleName(role),
}));
