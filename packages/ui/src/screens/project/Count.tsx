import type { ReactNode } from "react";

/** Sets a count phrase in a summary in bold, such as `3 new flashcards`. */
export function Count({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}
