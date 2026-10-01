import { useGetDictionaryStylesheetQuery } from "@easyimmerse/backend";
import { useMemo } from "react";
import { scopeDictionaryStylesheet } from "./scopeDictionaryStylesheet.ts";

/**
 * Applies a dictionary's own stylesheet to the element that contains this one, and to nothing else.
 * Renders nothing while the stylesheet loads, or when the backend cannot provide it.
 */
export function DictionaryStylesheet({
  dictionaryId,
}: {
  dictionaryId: string;
}) {
  const { data: stylesheet } = useGetDictionaryStylesheetQuery(dictionaryId);
  const scoped = useMemo(
    () => (stylesheet ? scopeDictionaryStylesheet(stylesheet) : null),
    [stylesheet],
  );
  return scoped && <style>{scoped}</style>;
}
