import type { AccountRole } from "@easyimmerse/types";
import { accountAccessSummary } from "../../lib/accountAccessSummary.ts";

const roles = [
  "library_user",
  "privileged",
  "administrator",
] satisfies AccountRole[];

/** The access a new account may start with, named as the account list names it, for a select. */
export const roleOptions = roles.map((role) => ({
  value: role,
  label: accountAccessSummary({ role, manages_library: false }),
}));
