import type { DictionaryStylesheet } from "@easyimmerse/types";
import { useMemo } from "react";
import type { ResolveMediaUrl } from "../definition/definitionContext.ts";
import { scopeDictionaryStylesheet } from "./scopeDictionaryStylesheet.ts";

/**
 * Applies each dictionary's own stylesheet to that dictionary's content and nowhere else, after sanitizing it.
 * Renders one style element per dictionary, however many entries of it are shown.
 */
export function DictionaryStylesheets({
  stylesheets,
  resolveMediaUrl,
}: {
  stylesheets: readonly DictionaryStylesheet[];
  resolveMediaUrl: ResolveMediaUrl;
}) {
  const scopedStylesheets = useMemo(
    () => scopeEach(stylesheets, resolveMediaUrl),
    [stylesheets, resolveMediaUrl],
  );
  return scopedStylesheets.map(({ dictionaryId, css }) => (
    <style key={dictionaryId}>{css}</style>
  ));
}

function scopeEach(
  stylesheets: readonly DictionaryStylesheet[],
  resolveMediaUrl: ResolveMediaUrl,
): DictionaryStylesheet[] {
  const byDictionary = new Map(
    stylesheets.map(({ dictionaryId, css }) => [dictionaryId, css]),
  );
  return [...byDictionary].map(([dictionaryId, css]) => ({
    dictionaryId,
    css: scopeDictionaryStylesheet(css, dictionaryId, resolveMediaUrl),
  }));
}
