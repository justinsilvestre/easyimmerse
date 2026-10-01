import type { ReactNode } from "react";

/** The caption above a form control. */
export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-fg-soft">
      {children}
    </label>
  );
}

/** The caption of a group of form controls, styled like a field label. */
export function FieldLegend({ children }: { children: ReactNode }) {
  return (
    <legend className="mb-2 text-sm font-medium text-fg-soft">
      {children}
    </legend>
  );
}
