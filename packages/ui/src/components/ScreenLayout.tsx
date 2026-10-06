import clsx from "clsx";
import type { ReactNode } from "react";
import { AppFooter } from "./AppFooter.tsx";

/**
 * Frames a screen with the app's header and footer, and places the given actions, such as a Help link, in the header.
 * The wide layout suits forms with a side column. The Settings screen hides the footer's link to itself.
 * On a phone with a notch or a home indicator, the header and footer keep clear of them.
 */
export function ScreenLayout({
  headerActions,
  wide = false,
  showSettingsLink = true,
  children,
}: {
  headerActions?: ReactNode;
  wide?: boolean;
  showSettingsLink?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="flex min-h-screen flex-col bg-canvas pb-[env(safe-area-inset-bottom)] text-fg">
      <header className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
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
      <AppFooter
        contentClassName={clsx("mx-auto", width)}
        showSettingsLink={showSettingsLink}
      />
    </div>
  );
}
