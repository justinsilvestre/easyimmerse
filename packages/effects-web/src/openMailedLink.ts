import { actions, type MailedLink, readMailedLink } from "@easyimmerse/state";

/** What opening a mailed link needs of the store. */
type LinkDispatch = (
  action: ReturnType<typeof actions.mailedLinkOpened>,
) => unknown;

/**
 * Hands the store the mailed link the page's address holds, if any, after removing its parameters from the address bar,
 * since the link's token works as a password does. Returns the link, or null when the address holds none.
 */
export function openMailedLink(
  store: { dispatch: LinkDispatch },
  page: Pick<Window, "location" | "history">,
): MailedLink | null {
  const { link, search } = readMailedLink(page.location.search);
  if (link === null) return null;
  const { pathname, hash } = page.location;
  page.history.replaceState(
    page.history.state,
    "",
    `${pathname}${search}${hash}`,
  );
  store.dispatch(actions.mailedLinkOpened(link));
  return link;
}
