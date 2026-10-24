import type { AccountUser } from "@easyimmerse/types";

/**
 * Names in a few words what an account may do on its server: "Server admin", which includes everything else,
 * else whichever of "Library admin" and "Full access" it has, or else "Learner".
 */
export function accountAccessSummary(
  user: Pick<AccountUser, "role" | "manages_library">,
): string {
  if (user.role === "administrator") return "Server admin";
  const accesses = [
    ...(user.manages_library ? ["Library admin"] : []),
    ...(user.role === "privileged" ? ["Full access"] : []),
  ];
  return accesses.length === 0 ? "Learner" : accesses.join(" · ");
}
