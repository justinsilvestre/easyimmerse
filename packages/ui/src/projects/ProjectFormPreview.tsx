import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button.tsx";
import { exampleFlashcard } from "../flashcards/exampleFlashcard.ts";
import { FlashcardPreview } from "../flashcards/FlashcardPreview.tsx";
import { addTags } from "../flashcards/parseTags.ts";
import { useMediaQuery, wideScreenQuery } from "../hooks/useMediaQuery.ts";
import type { ProjectFormValues } from "./editProject.ts";

/** The tag the example flashcard gets from its media file's name, when the project tags by media name. */
const exampleMediaNameTag = "dark-s01e01";

/**
 * The example flashcard under the form's current settings.
 * On a narrow screen it is drawn small, so that it stays in view beside the checkboxes, until expanded.
 */
export function ProjectFormPreview({ values }: { values: ProjectFormValues }) {
  const isWide = useMediaQuery(wideScreenQuery);
  const [isExpanded, setExpanded] = useState(false);
  const tags = values.tags_media_name
    ? addTags(values.default_tags, [exampleMediaNameTag])
    : [...values.default_tags];
  return (
    <aside className="flex flex-col gap-2 md:col-start-2 md:row-span-4 md:row-start-1 md:sticky md:top-4 md:self-start">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg-muted">Example flashcard</h2>
        <Button
          size="sm"
          variant="subtle"
          className="md:hidden"
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <Minimize2 className="size-3" aria-hidden />
          ) : (
            <Maximize2 className="size-3" aria-hidden />
          )}
          {isExpanded ? "Shrink" : "Expand"}
        </Button>
      </div>
      <FlashcardPreview
        content={{ ...exampleFlashcard, tags }}
        includedFields={values.flashcard_fields}
        languages={{
          target: values.target_language,
          translation: values.translation_language,
        }}
        compact={!isWide && !isExpanded}
      />
    </aside>
  );
}
