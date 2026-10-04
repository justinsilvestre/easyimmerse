import { useListDictionariesQuery } from "@easyimmerse/backend";
import type { ProjectSettings } from "@easyimmerse/types";
import { useNavigationActions } from "../../navigationContext.ts";
import { DictionaryStatus } from "../../projects/DictionaryStatus.tsx";
import { dictionaryStatusesOf } from "./dictionaryStatusesOf.ts";

/** Whether the project's languages have dictionaries, once the dictionaries have loaded. */
export function ProjectDictionaryStatus({
  settings,
}: {
  settings: ProjectSettings;
}) {
  const { data } = useListDictionariesQuery();
  const { openDictionaries } = useNavigationActions();
  if (!data) return null;
  return (
    <DictionaryStatus
      statuses={dictionaryStatusesOf(data.dictionaries, settings)}
      onOpenDictionaries={openDictionaries}
    />
  );
}
