import type { CurrentPrincipal } from "@easyimmerse/types";

/** Tells whether the app's principal may manage the library: the server's owner, an administrator, or an account let manage it. */
export function canManageLibrary(principal: CurrentPrincipal | undefined) {
  if (principal === undefined) return false;
  if (principal.kind === "launch") return true;
  return (
    principal.user.role === "administrator" || principal.user.manages_library
  );
}
