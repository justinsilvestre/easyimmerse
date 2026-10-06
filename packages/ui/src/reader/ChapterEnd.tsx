import { ArrowRight } from "lucide-react";
import { Button } from "../components/Button.tsx";

/** The close of a chapter in the scrolling layout: a way on to the next chapter, or the end of the book. */
export function ChapterEnd({
  nextTitle,
  onNext,
}: {
  /** The next chapter's title, or null after the last chapter. */
  nextTitle: string | null;
  onNext: () => void;
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 border-t border-line pt-10 font-sans text-base">
      {nextTitle === null ? (
        <p className="text-fg-muted">The end</p>
      ) : (
        <>
          <p className="text-sm text-fg-muted">Next chapter</p>
          <Button variant="secondary" onClick={onNext}>
            {nextTitle}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </>
      )}
    </div>
  );
}
