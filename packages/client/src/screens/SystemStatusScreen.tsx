import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { appActions } from "../state/appActions.ts";
import { useAppDispatch, useAppSelector } from "../state/hooks.ts";
import { useGetHealthReportQuery } from "../state/serverApi.ts";

/**
 * A placeholder screen showing how the parts of the app are connected.
 * The smoke tests use it to verify that the app can reach the server.
 */
export function SystemStatusScreen() {
  const dispatch = useAppDispatch();
  const { platform, serverUrl } = useAppSelector((state) => state.app);
  return (
    <ScreenLayout title="System status">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <StatusEntry label="Platform">{platform}</StatusEntry>
        <StatusEntry label="Server address">{serverUrl ?? "none"}</StatusEntry>
        {serverUrl && <ServerStatusEntries />}
      </dl>
      <div>
        <Button onClick={() => dispatch(appActions.screenOpened("home"))}>
          Back to home
        </Button>
      </div>
    </ScreenLayout>
  );
}

function ServerStatusEntries() {
  const { data: healthReport, isError } = useGetHealthReportQuery();
  return (
    <>
      <StatusEntry label="Server status">
        {describeServerStatus(healthReport !== undefined, isError)}
      </StatusEntry>
      {healthReport && (
        <StatusEntry label="ffmpeg version">
          {healthReport.ffmpegVersion ?? "unavailable"}
        </StatusEntry>
      )}
    </>
  );
}

function describeServerStatus(hasHealthReport: boolean, isError: boolean) {
  if (hasHealthReport) return "connected";
  return isError ? "unreachable" : "connecting";
}

function StatusEntry({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd data-testid={label}>{children}</dd>
    </>
  );
}
