import clsx from "clsx";
import { TextSizeMenu } from "./TextSizeMenu.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

/** Shows the theme switch at the bottom of a screen. `contentClassName` lets it line up with the screen's content. */
export function AppFooter({ contentClassName }: { contentClassName?: string }) {
  return (
    <footer className="border-t border-line">
      <div
        className={clsx(
          "flex flex-wrap items-center justify-end gap-x-6 gap-y-2 px-4 py-3",
          contentClassName,
        )}
      >
        <TextSizeMenu />
        <ThemeToggle />
      </div>
    </footer>
  );
}
