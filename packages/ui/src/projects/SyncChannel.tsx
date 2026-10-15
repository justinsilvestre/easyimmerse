import type { ReactNode } from "react";

/** One way the project's flashcards reach Anki, in the flashcards panel: a titled block with its status and buttons. */
export function SyncChannel({
  icon,
  title,
  headerAction,
  children,
}: {
  icon: ReactNode;
  title: string;
  /** A quiet button beside the title, such as one that turns the channel off. */
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col items-start gap-2 py-3 text-sm first:pt-0">
      <div className="flex w-full items-center gap-2">
        <span className="text-fg-muted">{icon}</span>
        <h3 className="flex-1 font-medium">{title}</h3>
        {headerAction}
      </div>
      {children}
    </section>
  );
}
