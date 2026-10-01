import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Frames a screen with the app header, which names the product and holds the given actions, such as a Help link.
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div
          className={clsx(
            "mx-auto flex items-center justify-between gap-4 px-4 py-3",
            width,
          )}
        >
          <span className="text-lg font-semibold tracking-tight">
            easy<span className="text-blue-600">Immerse</span>
          </span>
          <div className="flex items-center gap-2">{headerActions}</div>
        </div>
      </header>
      <main className={clsx("mx-auto flex flex-col gap-8 px-4 py-8", width)}>
        {children}
      </main>
    </div>
  );
}
