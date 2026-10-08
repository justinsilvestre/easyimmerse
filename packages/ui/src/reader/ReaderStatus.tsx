import { ArrowLeft } from "lucide-react";
import { Button } from "../components/Button.tsx";

/**
 * Stands in for the reader while a book opens, or when it cannot be opened.
 * The way back to the project stays where the reader's toolbar puts it.
 */
export function ReaderStatus({
  title,
  failure = null,
  onBack,
}: {
  title: string;
  /** Why the book could not be opened. Absent while it opens. */
  failure?: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col bg-canvas text-fg">
      <header className="flex h-12 items-center gap-1 border-b border-line bg-surface px-2">
        <Button
          variant="subtle"
          aria-label="Back to the project"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Project</span>
        </Button>
        <h1 className="min-w-0 flex-1 truncate px-2 text-center text-sm font-medium">
          {title}
        </h1>
      </header>
      <main className="flex flex-1 items-center justify-center p-6 text-center text-sm">
        {failure === null ? (
          <p className="text-fg-muted">Opening the book…</p>
        ) : (
          <p role="alert" className="max-w-md">
            The book could not be opened. {failure}
          </p>
        )}
      </main>
    </div>
  );
}
