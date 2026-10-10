import type { Definition } from "@easyimmerse/types";
import { ContentText } from "./ContentText.tsx";
import {
  DefinitionContext,
  type ResolveMediaUrl,
} from "./definitionContext.ts";
import { FormOfView } from "./FormOfView.tsx";
import { MarkupView } from "./MarkupView.tsx";
import { StructuredContentView } from "./StructuredContentView.tsx";
import { yomitanClassName } from "./yomitanClassName.ts";

/**
 * Renders one definition in the form its dictionary wrote it: plain text, Yomitan structured content, HTML, Pango or XDXF markup, or a pointer to a base form.
 * Double-clicked words go to `onWordLookup`, held words to `onWordHold`, links to other headwords go to `onLookup`, and images come from `resolveMediaUrl`. Nothing in a definition can run code or load remote resources.
 * Place it inside its dictionary's `DictionaryScope`, where `DictionaryStylesheets` applies the dictionary's own stylesheet.
 */
export function DefinitionView({
  definition,
  dictionaryId,
  resolveMediaUrl,
  onWordLookup,
  onWordHold,
  onLookup,
}: {
  definition: Definition;
  dictionaryId: string;
  resolveMediaUrl: ResolveMediaUrl;
  onWordLookup: (word: string) => void;
  onWordHold?: (word: string) => void;
  onLookup: (term: string) => void;
}) {
  return (
    <DefinitionContext
      value={{
        dictionaryId,
        resolveMediaUrl,
        onWordLookup,
        onWordHold,
        onLookup,
        isPlainText: false,
      }}
    >
      <DefinitionBody definition={definition} />
    </DefinitionContext>
  );
}

function DefinitionBody({ definition }: { definition: Definition }) {
  switch (definition.kind) {
    case "text":
      return <ContentText text={definition.text} />;
    case "structured":
      return (
        <span className={yomitanClassName("structured-content")}>
          <StructuredContentView content={definition.content} />
        </span>
      );
    case "html":
      return <MarkupView markup={definition.html} language="html" />;
    case "markup":
      return (
        <MarkupView markup={definition.markup} language={definition.dialect} />
      );
    case "formOf":
      return (
        <FormOfView
          base={definition.base}
          inflections={definition.inflections}
        />
      );
  }
}
