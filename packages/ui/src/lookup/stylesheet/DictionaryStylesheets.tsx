import type { DictionaryStylesheet } from "@easyimmerse/types";
import { useMemo } from "react";
import type { ResolveDictionaryMedia } from "../definition/definitionContext.ts";
import { scopeDictionaryStylesheet } from "./scopeDictionaryStylesheet.ts";

/**
 * Applies each dictionary's own stylesheet to that dictionary's content and nowhere else, after sanitizing it.
 * Renders one style element per dictionary, however many entries of it are shown.
 * With `remPx`, lengths in rem are written in pixels at that size of a rem.
 */
export function DictionaryStylesheets({
  stylesheets,
  resolveMedia,
  remPx,
}: {
  stylesheets: readonly DictionaryStylesheet[];
  resolveMedia: ResolveDictionaryMedia;
  remPx?: number;
}) {
  const scopedStylesheets = useMemo(
    () => scopeEach(stylesheets, resolveMedia, remPx),
    [stylesheets, resolveMedia, remPx],
  );
  return scopedStylesheets.map(({ dictionaryId, css }) => (
    <style key={dictionaryId}>{css}</style>
  ));
}

function scopeEach(
  stylesheets: readonly DictionaryStylesheet[],
  resolveMedia: ResolveDictionaryMedia,
  remPx: number | undefined,
): DictionaryStylesheet[] {
  const byDictionary = new Map(
    stylesheets.map(({ dictionaryId, css }) => [dictionaryId, css]),
  );
  return [...byDictionary].map(([dictionaryId, css]) => ({
    dictionaryId,
    css: scopeDictionaryStylesheet(css, dictionaryId, resolveMedia, remPx),
  }));
}
