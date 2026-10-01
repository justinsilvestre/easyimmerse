import { actions } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/** Fills the window with the media below a bar holding the way back to the project, the media's name, and the lookup button. */
export function MediaScreenLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  return (
    <div className="flex h-dvh flex-col bg-neutral-950">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2 text-fg">
        <Button
          variant="subtle"
          className="-mx-2 shrink-0"
          onClick={() => dispatch(actions.mediaClosed())}
        >
          <span aria-hidden="true">←</span> Back
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-semibold">{title}</h1>
        <Button
          className="shrink-0"
          onClick={() => dispatch(actions.lookupOpenedForTyping())}
        >
          Look up
        </Button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
