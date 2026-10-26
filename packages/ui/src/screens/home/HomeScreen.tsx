import {
  useGetCurrentPrincipalQuery,
  useListProjectsQuery,
  useListReviewCountsQuery,
} from "@easyimmerse/backend";
import { canManageLibrary } from "@easyimmerse/state";
import { ConnectedBackupNudgeCard } from "./ConnectedBackupNudgeCard.tsx";
import { ConnectedEncoderNotice } from "./ConnectedEncoderNotice.tsx";
import { HomeView, type ProjectListStatus } from "./HomeView.tsx";
import { isOfflineError } from "./isOfflineError.ts";

/**
 * The home screen with the projects the server lists, most recently opened first.
 * Above them, a card suggests backing up a flashcard kept only on this device.
 * On the desktop app, it tells the person once when no video encoder works.
 */
export function HomeScreen() {
  const { data, isLoading, error } = useListProjectsQuery();
  // Counted afresh on each visit, since what is due depends on the time of day.
  const reviewCounts = useListReviewCountsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  }).data?.projects;
  const principal = useGetCurrentPrincipalQuery("self").data;
  return (
    <>
      <HomeView
        status={statusOf(isLoading, error)}
        projects={data?.projects ?? []}
        reviewCounts={reviewCounts ?? []}
        canManageLibrary={canManageLibrary(principal)}
        suggestion={<ConnectedBackupNudgeCard />}
      />
      <ConnectedEncoderNotice />
    </>
  );
}

function statusOf(isLoading: boolean, error: unknown): ProjectListStatus {
  if (isLoading) return "loading";
  if (isOfflineError(error)) return "offline";
  if (error) return "failed";
  return "ready";
}
