import type { ReactNode } from "react";

/** A short explanation below a form control. Point the control's `aria-describedby` at its id. */
export function FieldHint({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="text-xs text-fg-muted">
      {children}
    </p>
  );
}
