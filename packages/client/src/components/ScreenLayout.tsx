import type { ReactNode } from "react";

export function ScreenLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
