import clsx from "clsx";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle.tsx";

/**
 * Frames a screen with the app header, which names the product and holds the given actions, such as a Help link,
 * and a footer with the dark mode switch.
 * A wide layout suits forms with a side column.
 */
export function ScreenLayout({
  headerActions,
  wide = false,
  children,
}: {
  headerActions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <header className="border-b border-line bg-surface">
        <div
          className={clsx(
            "mx-auto flex items-center justify-between gap-4 px-4 py-3",
            width,
          )}
        >
          <span className="text-lg font-semibold tracking-tight">
            easy<span className="text-accent">Immerse</span>
          </span>
          <div className="flex items-center gap-2">{headerActions}</div>
        </div>
      </header>
      <main
        className={clsx(
          "mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8",
          width,
        )}
      >
        {children}
      </main>
      <footer className="border-t border-line">
        <div className={clsx("mx-auto flex justify-end px-4 py-3", width)}>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
