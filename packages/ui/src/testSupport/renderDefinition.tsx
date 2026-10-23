import type { Definition } from "@easyimmerse/types";
import { render } from "@testing-library/react";
import { DefinitionView } from "../lookup/definition/DefinitionView.tsx";
import type { ResolveDictionaryMedia } from "../lookup/definition/definitionContext.ts";
import { DictionaryScope } from "../lookup/stylesheet/DictionaryScope.tsx";

/** Renders a definition from the dictionary `dict` in that dictionary's scope, with no media unless `resolveMedia` supplies some. */
export function renderDefinition(
  definition: Definition,
  {
    onWordLookup = () => undefined,
    onLookup = () => undefined,
    resolveMedia = () => null,
  }: {
    onWordLookup?: (word: string) => void;
    onLookup?: (term: string) => void;
    resolveMedia?: ResolveDictionaryMedia;
  } = {},
) {
  return render(
    <DictionaryScope dictionaryId="dict">
      <DefinitionView
        definition={definition}
        dictionaryId="dict"
        resolveMedia={resolveMedia}
        onWordLookup={onWordLookup}
        onLookup={onLookup}
      />
    </DictionaryScope>,
  );
}

/** Resolves every media path to a fake URL that names the dictionary and the path. */
export function resolveFakeMediaUrl(dictionaryId: string, path: string) {
  return `media://${dictionaryId}/${path}`;
}
