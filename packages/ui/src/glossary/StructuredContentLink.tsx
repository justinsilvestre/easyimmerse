import { actions } from "@easyimmerse/state";
import type { LinkElement } from "@easyimmerse/types";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { parseSearchLink } from "./parseSearchLink.ts";
import { ReferenceButton } from "./ReferenceButton.tsx";
import { StructuredContent } from "./StructuredContent.tsx";

/**
 * Renders a structured-content link.
 * A link that searches the dictionaries looks its term up in the popup, and a web link opens outside the app.
 * Any other link shows only its content.
 */
export function StructuredContentLink({
  link,
  dictionaryId,
}: {
  link: LinkElement;
  dictionaryId: string;
}) {
  const dispatch = useAppDispatch();
  const content = (
    <StructuredContent content={link.content} dictionaryId={dictionaryId} />
  );
  const reference = parseSearchLink(link.href);
  if (reference !== null)
    return (
      <ReferenceButton reference={reference} lang={link.lang}>
        {content}
      </ReferenceButton>
    );
  if (!/^https?:\/\//i.test(link.href))
    return <span lang={link.lang}>{content}</span>;
  return (
    <a
      href={link.href}
      lang={link.lang}
      target="_blank"
      rel="noreferrer noopener"
      className="relative z-20 text-blue-700 underline underline-offset-2"
      onClick={(event) => {
        event.preventDefault();
        dispatch(actions.externalLinkRequested(link.href));
      }}
    >
      {content}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
