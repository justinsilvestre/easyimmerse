import { useId } from "react";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";

/** Shows how many flashcards a project has and the ways to study them: in Anki, through a deck file or AnkiConnect, or in easyImmerse itself. */
export function FlashcardsSummary({
  count,
  onExportAnkiPackage,
  onSetUpAnkiConnect,
  onStartReview,
}: {
  count: number;
  onExportAnkiPackage: () => void;
  onSetUpAnkiConnect: () => void;
  onStartReview: () => void;
}) {
  const headingId = useId();
  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      className="flex flex-col gap-4 p-5"
    >
      <div>
        <h2 id={headingId} className="text-lg font-semibold">
          Flashcards
        </h2>
        <p className="text-sm text-gray-500">{describeFlashcardCount(count)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onStartReview}>
          Review in easyImmerse
        </Button>
        <Button onClick={onExportAnkiPackage}>Export Anki deck</Button>
        <Button onClick={onSetUpAnkiConnect}>Set up AnkiConnect</Button>
      </div>
    </Card>
  );
}

function describeFlashcardCount(count: number): string {
  if (count === 0) return "No flashcards yet";
  return count === 1 ? "1 flashcard" : `${count.toLocaleString()} flashcards`;
}
