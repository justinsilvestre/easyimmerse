import { useListProjectsQuery } from "@easyimmerse/backend";
import {
  actions,
  type BackupSign,
  type SyncPlace,
  selectBackupSign,
  selectIsSuggestionDismissed,
  selectPreferencesLoaded,
  selectSyncPlace,
} from "@easyimmerse/state";
import type { Project } from "@easyimmerse/types";
import { shallowEqual } from "react-redux";
import { useSyncQueries } from "../account/useSyncQueries.ts";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { BackupNudgeCard } from "./BackupNudgeCard.tsx";

/**
 * Shows the card about backing up once some listed project has a flashcard while the work is kept only on this device,
 * until the person dismisses it.
 */
export function ConnectedBackupNudgeCard() {
  useSyncQueries();
  const dispatch = useAppDispatch();
  const place = useAppSelector(selectSyncPlace, shallowEqual);
  const sign = useAppSelector(selectBackupSign, shallowEqual);
  const projects = useListProjectsQuery().data?.projects ?? [];
  const isDismissed = useAppSelector(selectIsSuggestionDismissed("backup"));
  const arePreferencesLoaded = useAppSelector(selectPreferencesLoaded);
  if (!arePreferencesLoaded || isDismissed) return null;
  if (!isWorkAtRisk(place, sign, projects)) return null;
  return (
    <BackupNudgeCard
      place={place}
      sign={sign}
      onDismiss={() => dispatch(actions.suggestionDismissed("backup"))}
    />
  );
}

/**
 * Tells whether a flashcard is kept only on this device.
 * The sign must say so too, since a built-in server counts as unlinked until it reports its status, and the sign waits for that report.
 */
function isWorkAtRisk(
  place: SyncPlace,
  sign: BackupSign,
  projects: readonly Project[],
): boolean {
  return (
    place.kind === "thisDevice" &&
    (sign.kind === "deviceOnly" || sign.kind === "browserOnly") &&
    projects.some((project) => project.flashcard_count > 0)
  );
}
