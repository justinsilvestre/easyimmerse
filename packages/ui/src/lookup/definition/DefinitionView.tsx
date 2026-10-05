import type { Definition } from "@easyimmerse/types";
import { DictionaryScope } from "../stylesheet/DictionaryScope.tsx";
import { ContentText } from "./ContentText.tsx";
import {
  DefinitionContext,
  type ResolveMediaUrl,
} from "./definitionContext.ts";
import { FormOfView } from "./FormOfView.tsx";
import { MarkupView } from "./MarkupView.tsx";
import { StructuredContentView } from "./StructuredContentView.tsx";

/**
 * Renders one definition in the form its dictionary wrote it: plain text, Yomitan structured content, HTML, Pango or XDXF markup, or a pointer to a base form.
 * Clicked words go to `onWordClick`, links to other headwords go to `onLookup`, and images come from `resolveMediaUrl`. Nothing in a definition can run code or load remote resources.
 * The definition sits in its dictionary's scope, where `DictionaryStylesheets` applies the dictionary's own stylesheet.
 */
export function DefinitionView({
  definition,
  dictionaryId,
  resolveMediaUrl,
  onWordClick,
  onLookup,
}: {
  definition: Definition;
  dictionaryId: string;
  resolveMediaUrl: ResolveMediaUrl;
  onWordClick: (word: string) => void;
  onLookup: (term: string) => void;
}) {
  return (
    <DefinitionContext
      value={{
        dictionaryId,
        resolveMediaUrl,
        onWordClick,
        onLookup,
        isPlainText: false,
      }}
    >
      <DictionaryScope dictionaryId={dictionaryId}>
        <DefinitionBody definition={definition} />
      </DictionaryScope>
    </DefinitionContext>
  );
}

function DefinitionBody({ definition }: { definition: Definition }) {
  switch (definition.kind) {
    case "text":
      return <ContentText text={definition.text} />;
    case "structured":
      return <StructuredContentView content={definition.content} />;
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
