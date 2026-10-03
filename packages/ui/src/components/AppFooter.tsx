import clsx from "clsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

/** Shows the theme switch at the bottom of a screen. `contentClassName` lets it line up with the screen's content. */
export function AppFooter({ contentClassName }: { contentClassName?: string }) {
  return (
    <footer className="border-t border-line">
      <div
        className={clsx(
          "flex items-center justify-end gap-4 px-4 py-3",
          contentClassName,
        )}
      >
        <ThemeToggle />
      </div>
    </footer>
  );
}
