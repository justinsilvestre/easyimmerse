import { actions } from "@easyimmerse/state";
import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "../debounce.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** How long typing must pause before the typed term is looked up. */
const typingPauseMs = 300;

/**
 * Takes focus on mount and looks up what the user types once typing pauses.
 * Shows the new term when the lookup moves to another one, such as by following a cross-reference.
 */
export function DictionaryPopupTermInput({
  initialTerm,
}: {
  initialTerm: string;
}) {
  const dispatch = useAppDispatch();
  const [term, setTerm] = useState(initialTerm);
  const [shownTerm, setShownTerm] = useState(initialTerm);
  if (initialTerm !== shownTerm) {
    setShownTerm(initialTerm);
    if (initialTerm !== term.trim()) setTerm(initialTerm);
  }
  const input = useRef<HTMLInputElement>(null);
  const sendTerm = useMemo(
    () =>
      debounce(
        (typed: string) => dispatch(actions.lookupTermTyped(typed.trim())),
        typingPauseMs,
      ),
    [dispatch],
  );
  useEffect(() => () => sendTerm.cancel(), [sendTerm]);
  useEffect(() => input.current?.focus(), []);
  return (
    <input
      ref={input}
      type="search"
      aria-label="Word"
      placeholder="Type a word"
      value={term}
      className="min-w-0 flex-1 rounded border border-line-strong px-2 py-1 text-lg focus:border-accent focus:outline-none"
      onChange={(event) => {
        setTerm(event.target.value);
        sendTerm(event.target.value);
      }}
    />
  );
}
