/** A link a server mailed to an account, which carries a token that confirms its email address or lets it choose a new password. */
export type MailedLink = {
  kind: "confirmEmail" | "resetPassword";
  token: string;
};

const parameters = {
  confirmEmail: "confirm_email",
  resetPassword: "reset_password",
} satisfies Record<MailedLink["kind"], string>;

const kinds = Object.keys(parameters) as MailedLink["kind"][];

/**
 * Reads the mailed link that the query string of the address the app opened at holds, if any,
 * and returns the query string without the link's parameters, since its token works as a password does.
 */
export function readMailedLink(search: string): {
  link: MailedLink | null;
  search: string;
} {
  const pairs = search.replace(/^\?/, "").split("&").filter(Boolean);
  const isLinkPair = (pair: string) =>
    kinds.some((kind) => parameterNameOf(pair) === parameters[kind]);
  const rest = pairs.filter((pair) => !isLinkPair(pair)).join("&");
  return { link: linkIn(pairs), search: rest === "" ? "" : `?${rest}` };
}

function linkIn(pairs: readonly string[]): MailedLink | null {
  for (const kind of kinds) {
    const pair = pairs.find(
      (each) => parameterNameOf(each) === parameters[kind],
    );
    const token = pair === undefined ? "" : parameterValueOf(pair);
    if (token !== "") return { kind, token };
  }
  return null;
}

function parameterNameOf(pair: string): string {
  return decodeQueryPart(pair.split("=")[0] ?? "");
}

function parameterValueOf(pair: string): string {
  const start = pair.indexOf("=");
  return start === -1 ? "" : decodeQueryPart(pair.slice(start + 1));
}

function decodeQueryPart(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return "";
  }
}
