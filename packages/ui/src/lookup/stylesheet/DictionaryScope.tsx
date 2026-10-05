import type { ReactNode } from "react";
import { scopeAttribute } from "./dictionaryScope.ts";

/**
 * Yomitan's theme variables, which dictionary stylesheets written for Yomitan read, set to the app's own colors so that they follow its theme.
 * They carry the prefix that sanitizing gives custom properties, and the dictionary's stylesheet may still redefine them.
 */
const yomitanVariables = [
  "[--dict-text-color:var(--color-fg)]",
  "[--dict-text-color-light3:var(--color-fg-muted)]",
  "[--dict-background-color:var(--color-surface)]",
  "[--dict-light-border-color:var(--color-line)]",
  "[--dict-link-color:var(--color-accent-fg)]",
  "[--dict-accent-color:var(--color-accent)]",
  "[--dict-font-size-no-units:14]",
].join(" ");

/**
 * Holds content from one dictionary, inside the element that the dictionary's stylesheet is confined to.
 * The outer element positions, clips and stacks everything the stylesheet places, so that the dictionary cannot draw over the app around it.
 * Its stylesheet cannot select the outer element, so it cannot undo this.
 * The inner element defines the theme variables that stylesheets written for Yomitan expect.
 */
export function DictionaryScope({
  dictionaryId,
  children,
}: {
  dictionaryId: string;
  children: ReactNode;
}) {
  return (
    <div className="isolate overflow-x-auto [contain:layout]">
      <div className={yomitanVariables} {...{ [scopeAttribute]: dictionaryId }}>
        {children}
      </div>
    </div>
  );
}
