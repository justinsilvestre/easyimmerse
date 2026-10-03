import { ThemeToggle } from "./ThemeToggle.tsx";

/** Closes a screen with the dark mode switch. */
export function ScreenFooter() {
  return (
    <footer className="flex justify-end border-t border-line pt-3">
      <ThemeToggle />
    </footer>
  );
}
