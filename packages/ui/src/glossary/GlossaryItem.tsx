import type { Deinflection, Glossary } from "@easyimmerse/types";
import clsx from "clsx";
import { DictionaryImage } from "./DictionaryImage.tsx";
import { ReferenceButton } from "./ReferenceButton.tsx";
import { StructuredContent } from "./StructuredContent.tsx";

/** Shows one definition of a dictionary entry, in any of the forms a Yomitan dictionary allows. */
export function GlossaryItem({
  glossary,
  dictionaryId,
}: {
  glossary: Glossary;
  /** The dictionary the definition comes from, which serves its images. */
  dictionaryId: string;
}) {
  if (typeof glossary === "string") return <MultilineText text={glossary} />;
  if (Array.isArray(glossary))
    return <DeinflectionNote deinflection={glossary} />;
  switch (glossary.type) {
    case "text":
      return <MultilineText text={glossary.text} />;
    case "image":
      return (
        <>
          <DictionaryImage image={glossary} dictionaryId={dictionaryId} />
          {glossary.description !== undefined && (
            <MultilineText text={glossary.description} block />
          )}
        </>
      );
    case "structured-content":
      return (
        <StructuredContent
          content={glossary.content}
          dictionaryId={dictionaryId}
        />
      );
  }
}

function MultilineText({ text, block }: { text: string; block?: boolean }) {
  return (
    <span className={clsx("whitespace-pre-line", block && "block")}>
      {text}
    </span>
  );
}

function DeinflectionNote({
  deinflection: [term, inflections],
}: {
  deinflection: Deinflection;
}) {
  return (
    <span className="text-gray-600">
      Inflected form of{" "}
      <ReferenceButton reference={{ term, reading: null }}>
        {term}
      </ReferenceButton>
      {inflections.length > 0 && ` (${inflections.join(", ")})`}
    </span>
  );
}
