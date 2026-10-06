import { useEffect, useRef, useState } from "react";

/**
 * Asks before a dictionary is removed, and once the confirmed dictionary has left the list,
 * moves focus to `headingRef`, since the row that held focus is gone.
 */
export function useRemovalConfirmation(
  dictionaryIds: readonly string[],
  onRemove: (dictionaryId: string) => void,
) {
  const [askingId, setAskingId] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isRemovedGone =
    removedId !== null && !dictionaryIds.includes(removedId);
  useEffect(() => {
    if (!isRemovedGone) return;
    headingRef.current?.focus();
    setRemovedId(null);
  }, [isRemovedGone]);
  return {
    headingRef,
    /** The dictionary being asked about, or null. */
    askingId:
      askingId !== null && dictionaryIds.includes(askingId) ? askingId : null,
    ask: setAskingId,
    confirm: () => {
      if (askingId === null) return;
      setAskingId(null);
      setRemovedId(askingId);
      onRemove(askingId);
    },
    cancel: () => setAskingId(null),
  };
}
