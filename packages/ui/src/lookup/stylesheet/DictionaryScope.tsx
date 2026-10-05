import type { ReactNode } from "react";
import { scopeAttribute } from "./dictionaryScope.ts";

/**
 * Holds content from one dictionary, inside the element that the dictionary's stylesheet is confined to.
 * The outer element positions, clips and stacks everything the stylesheet places, so that the dictionary cannot draw over the app around it.
 * Its stylesheet cannot select the outer element, so it cannot undo this.
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
      <div {...{ [scopeAttribute]: dictionaryId }}>{children}</div>
    </div>
  );
}
