import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { appActions } from "../state/appActions.ts";
import { useAppDispatch, useAppSelector } from "../state/hooks.ts";
import { useGetProjectsQuery } from "../state/serverApi.ts";

/** A placeholder for the home screen. */
export function HomeScreen() {
  const dispatch = useAppDispatch();
  return (
    <ScreenLayout title="easyImmerse">
      <p>Learn languages through native media.</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Recent projects</h2>
        <RecentProjects />
      </section>
      <div>
        <Button
          onClick={() => dispatch(appActions.screenOpened("systemStatus"))}
        >
          System status
        </Button>
      </div>
    </ScreenLayout>
  );
}

function RecentProjects() {
  const hasServer = useAppSelector((state) => state.app.serverUrl !== null);
  const { data: projects = [] } = useGetProjectsQuery(undefined, {
    skip: !hasServer,
  });
  if (projects.length === 0) return <p>You have no projects yet.</p>;
  return (
    <ul className="list-inside list-disc">
      {projects.map((project) => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
