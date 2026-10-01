import type { ReactNode } from "react";

/** Frames a screen with the app header, which names the product and holds the given actions, such as a Help link. */
export function ScreenLayout({
  headerActions,
  children,
}: {
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">
            easy<span className="text-blue-600">Immerse</span>
          </span>
          <div className="flex items-center gap-2">{headerActions}</div>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
