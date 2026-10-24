import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { clickableWordAttribute } from "./lookupTrigger.ts";
import {
  createWordClickMemory,
  type WordClickMemory,
} from "./wordClickMemory.ts";

const WordClickMemoryContext = createContext<WordClickMemory | null>(null);

/**
 * Gives the clickable text inside it one memory of the first click of a double-click,
 * which a click that lands on no word clears.
 */
export function WordClickMemoryProvider({ children }: { children: ReactNode }) {
  const [memory] = useState(createWordClickMemory);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const isOnWord =
        target instanceof Element &&
        target.closest(`[${clickableWordAttribute}]`) !== null;
      if (!isOnWord) memory.forget();
    };
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, [memory]);
  return (
    <WordClickMemoryContext value={memory}>{children}</WordClickMemoryContext>
  );
}

/** The app's memory of a first click, or, outside a provider, one of the component's own. */
export function useWordClickMemory(): WordClickMemory {
  const shared = useContext(WordClickMemoryContext);
  const [own] = useState(createWordClickMemory);
  return shared ?? own;
}
