import { actions, type LookupReference } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** Looks up the term that a dictionary entry refers to, in the open dictionary popup. */
export function ReferenceButton({
  reference,
  lang,
  children,
}: {
  reference: LookupReference;
  lang?: string;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  return (
    <button
      type="button"
      lang={lang}
      className="pointer-events-auto inline cursor-pointer text-blue-700 underline decoration-dotted underline-offset-2 hover:decoration-solid"
      onClick={() => dispatch(actions.lookupReferenceFollowed(reference))}
    >
      {children}
    </button>
  );
}
