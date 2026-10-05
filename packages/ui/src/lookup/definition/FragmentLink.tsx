import clsx from "clsx";
import type { MouseEvent, ReactNode } from "react";
import {
  dictionaryElementId,
  scopeAttribute,
} from "../stylesheet/dictionaryScope.ts";
import { PlainTextScope } from "./ContentText.tsx";
import { useDefinitionContext } from "./definitionContext.ts";

/**
 * Renders a link to an element of the same definition, found by the id the dictionary gave it.
 * Following the link scrolls to the element without changing the page's address.
 */
export function FragmentLink({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children?: ReactNode;
}) {
  const { dictionaryId } = useDefinitionContext();
  const elementId = dictionaryElementId(dictionaryId, id);
  if (!elementId) return children;
  return (
    <a
      href={`#${elementId}`}
      onClick={(event) => scrollToElement(event, elementId)}
      className={clsx("text-accent-fg underline underline-offset-2", className)}
    >
      <PlainTextScope>{children}</PlainTextScope>
    </a>
  );
}

/** Scrolls to the element with the given id in the link's own definition, which may share ids with other definitions from the same dictionary. */
function scrollToElement(event: MouseEvent<HTMLElement>, elementId: string) {
  event.preventDefault();
  const scope = event.currentTarget.closest(`[${scopeAttribute}]`);
  const target = [...(scope?.querySelectorAll("[id]") ?? [])].find(
    (element) => element.id === elementId,
  );
  target?.scrollIntoView({ block: "nearest" });
}
