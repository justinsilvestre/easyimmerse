import clsx from "clsx";
import { ExternalLink, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { PlainTextScope } from "./ContentText.tsx";
import type { LinkTarget } from "./classifyHref.ts";
import { useDefinitionContext } from "./definitionContext.ts";
import { FragmentLink } from "./FragmentLink.tsx";

/**
 * Renders a link in a definition: a lookup, an element of the same definition, an external page opened in a new window, an inert sound control, or plain content.
 * `className` adds classes that dictionary stylesheets select the link by.
 */
export function ContentLink({
  target,
  className,
  children,
}: {
  target: LinkTarget;
  className?: string;
  children?: ReactNode;
}) {
  const { onLookup } = useDefinitionContext();
  switch (target.kind) {
    case "lookup":
      return (
        <button
          type="button"
          onClick={() => onLookup(target.term)}
          className={clsx(
            "text-accent-fg underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-accent",
            className,
          )}
        >
          <PlainTextScope>{children}</PlainTextScope>
        </button>
      );
    case "fragment":
      return (
        <FragmentLink id={target.id} className={className}>
          {children}
        </FragmentLink>
      );
    case "external":
      return (
        <a
          href={target.url}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "text-accent-fg underline underline-offset-2",
            className,
          )}
        >
          <PlainTextScope>{children}</PlainTextScope>
          <ExternalLink
            className="ml-0.5 inline size-3 align-baseline"
            aria-hidden
          />
        </a>
      );
    case "sound":
      return (
        <span className={clsx("inline-flex items-center gap-1", className)}>
          <SoundControl />
          <PlainTextScope>{children}</PlainTextScope>
        </span>
      );
    case "none":
      return children;
  }
}

/** A play control for a dictionary sound. Playing dictionary sounds is not supported yet, so it is disabled. */
export function SoundControl() {
  return (
    <button
      type="button"
      disabled
      aria-label="Play sound"
      title="Playing dictionary sounds is not supported yet"
      className="inline-flex size-5 items-center justify-center rounded text-fg-faint disabled:cursor-not-allowed"
    >
      <Volume2 className="size-3.5" aria-hidden />
    </button>
  );
}
