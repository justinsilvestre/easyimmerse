import { useId } from "react";
import { ThemeChoiceControl } from "./ThemeChoiceControl.tsx";

/** The Display section of Settings, which sets how the app looks on this device. */
export function DisplaySection() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-base font-semibold">
        Display
      </h3>
      <ThemeChoiceControl size="md" />
    </section>
  );
}
