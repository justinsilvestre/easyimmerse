import { createContext, useContext } from "react";

/**
 * Returns a URL for a file stored with a dictionary, such as an image, or null when the file is not available.
 * `path` is written as the dictionary writes it, relative to the dictionary's root, without a leading slash.
 */
export type ResolveMediaUrl = (
  dictionaryId: string,
  path: string,
) => string | null;

type DefinitionContextValue = {
  dictionaryId: string;
  resolveMediaUrl: ResolveMediaUrl;
  onWordClick: (word: string) => void;
  /** Whether text renders without clickable words, as inside a link or a reading above a word. */
  isPlainText: boolean;
};

/** What every part of a definition needs from the definition around it. */
export const DefinitionContext = createContext<DefinitionContextValue | null>(
  null,
);

export function useDefinitionContext(): DefinitionContextValue {
  const context = useContext(DefinitionContext);
  if (!context)
    throw new Error("Definition content must render inside a DefinitionView.");
  return context;
}
