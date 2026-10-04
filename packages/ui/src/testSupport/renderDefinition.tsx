import type { Definition } from "@easyimmerse/types";
import { render } from "@testing-library/react";
import { DefinitionView } from "../lookup/definition/DefinitionView.tsx";
import type { ResolveMediaUrl } from "../lookup/definition/definitionContext.ts";

/** Renders a definition from the dictionary `dict`, with no media unless `resolveMediaUrl` supplies some. */
export function renderDefinition(
  definition: Definition,
  {
    onWordClick = () => undefined,
    resolveMediaUrl = () => null,
  }: {
    onWordClick?: (word: string) => void;
    resolveMediaUrl?: ResolveMediaUrl;
  } = {},
) {
  return render(
    <DefinitionView
      definition={definition}
      dictionaryId="dict"
      resolveMediaUrl={resolveMediaUrl}
      onWordClick={onWordClick}
    />,
  );
}

/** Resolves every media path to a fake URL that names the dictionary and the path. */
export function resolveFakeMediaUrl(dictionaryId: string, path: string) {
  return `media://${dictionaryId}/${path}`;
}
