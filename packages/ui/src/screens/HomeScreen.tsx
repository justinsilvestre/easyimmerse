import {
  useListProjectsQuery,
  useMarkProjectOpenedMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { EmptyState } from "../components/EmptyState.tsx";
import { HelpLink } from "../components/HelpLink.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { isOfflineError } from "../isOfflineError.ts";
import { HomeScreenView } from "./HomeScreenView.tsx";

/** Lists the projects the server holds. Without a server, it explains where projects can be kept instead. */
export function HomeScreen() {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useListProjectsQuery();
  const [markProjectOpened] = useMarkProjectOpenedMutation();
  if (isOfflineError(error)) return <HomeScreenOffline />;
  return (
    <HomeScreenView
      projects={data?.projects ?? []}
      loading={isLoading}
      error={error ? "Could not load your projects." : null}
      onOpenProject={(projectId) => {
        markProjectOpened(projectId);
        dispatch(actions.projectOpened(projectId));
      }}
      onCreateProject={() => dispatch(actions.newProjectFormOpened())}
      headerActions={<HelpLink />}
    />
  );
}

function HomeScreenOffline() {
  return (
    <ScreenLayout headerActions={<HelpLink />}>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <EmptyState title="Projects need the desktop app or a server">
        This copy of easyImmerse runs without a server, so it cannot keep
        projects yet. Open easyImmerse in the desktop app, or from a server you
        run, to create projects and save flashcards.
      </EmptyState>
    </ScreenLayout>
  );
}
