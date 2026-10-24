import { type ReactNode, useId } from "react";

/** A titled group of the general settings, such as those kept per device, holding their rows and sections. */
export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2
        id={headingId}
        className="text-sm font-semibold tracking-wide text-fg-muted uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
