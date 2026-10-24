import type { ReactNode } from "react";

/** Shows a keyboard shortcut, for example next to the action it triggers. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface-muted px-1 font-mono text-[0.7rem] text-fg-muted">
      {children}
    </kbd>
  );
}
