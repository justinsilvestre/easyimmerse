import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ProfileMenu } from "../account/ProfileMenu.tsx";
import { AppFooter } from "./AppFooter.tsx";
import { Button } from "./Button.tsx";

/**
 * Frames a screen with the app's header and footer. The header holds the Profile menu at its right,
 * and at its left the wordmark, or the Back button on a screen with a way back, which passes `onBack`.
 * `backLabel` names where Back leads, such as "Projects", and is hidden on a phone, where the arrow alone stands for it.
 * The wide layout suits forms with a side column. The footer stays at the bottom of the window.
 * On a phone with a notch or a home indicator, the header and footer keep clear of them.
 */
export function ScreenLayout({
  onBack,
  backLabel = "Back",
  wide = false,
  children,
}: {
  onBack?: () => void;
  backLabel?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="flex min-h-dvh flex-col bg-canvas pb-[env(safe-area-inset-bottom)] text-fg">
      <header className="border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
        <div
          className={clsx(
            "mx-auto flex items-center justify-between gap-4 px-4 py-3",
            width,
          )}
        >
          {onBack ? (
            <Button variant="subtle" aria-label={backLabel} onClick={onBack}>
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{backLabel}</span>
            </Button>
          ) : (
            <span className="text-base font-semibold tracking-tight">
              easy<span className="text-accent">Immerse</span>
            </span>
          )}
          <ProfileMenu />
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
      <AppFooter />
    </div>
  );
}
