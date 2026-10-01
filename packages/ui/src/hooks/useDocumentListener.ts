import { useEffect, useEffectEvent } from "react";

/** Listens for an event on the whole document for as long as the calling component is mounted. */
export function useDocumentListener<Type extends keyof DocumentEventMap>(
  type: Type,
  listener: (event: DocumentEventMap[Type]) => void,
) {
  const onEvent = useEffectEvent(listener);
  useEffect(() => {
    const handle = (event: DocumentEventMap[Type]) => onEvent(event);
    document.addEventListener(type, handle);
    return () => document.removeEventListener(type, handle);
  }, [type]);
}
