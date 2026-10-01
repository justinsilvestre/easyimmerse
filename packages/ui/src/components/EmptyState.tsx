import type { ReactNode } from "react";

/** A dashed placeholder box that explains why a list is empty and how to fill it. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{children}</p>
    </div>
  );
}
