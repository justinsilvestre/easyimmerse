import type { DesktopServerStatusView } from "@easyimmerse/state";
import { Badge } from "../../components/common/Badge.tsx";
import { Button } from "../../components/common/Button.tsx";

const stateLabels: Record<
  DesktopServerStatusView["state"],
  { label: string; tone: "neutral" | "success" | "danger" | "info" }
> = {
  unknown: { label: "Checking", tone: "neutral" },
  stopped: { label: "Stopped", tone: "neutral" },
  starting: { label: "Starting", tone: "info" },
  running: { label: "Running", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

/**
 * Whether the server runs, where other devices reach it and what it serves, with the buttons that start and stop it,
 * and why it failed when it did.
 */
export function ServerStatusBlock({
  status,
  onStart,
  onStop,
}: {
  status: DesktopServerStatusView;
  onStart: () => void;
  onStop: () => void;
}) {
  const { label, tone } = stateLabels[status.state];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          Status <Badge tone={tone}>{label}</Badge>
        </p>
        <span className="flex-1" />
        {status.canStop ? (
          <Button onClick={onStop}>Stop the server</Button>
        ) : (
          <Button
            variant="primary"
            aria-disabled={!status.canStart}
            onClick={status.canStart ? onStart : undefined}
          >
            Start the server
          </Button>
        )}
      </div>
      {status.state === "running" && <RunningDetails status={status} />}
      {status.failure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {status.failure}
        </p>
      )}
    </div>
  );
}

function RunningDetails({ status }: { status: DesktopServerStatusView }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {status.urls.length === 0 ? (
        <p className="text-fg-muted">
          This computer is not connected to a network, so no other device can
          reach the server.
        </p>
      ) : (
        <ServerAddresses status={status} />
      )}
    </div>
  );
}

function ServerAddresses({ status }: { status: DesktopServerStatusView }) {
  return (
    <>
      <p className="text-fg-muted">
        {status.isLanReachable
          ? "Reachable from other devices on this network, if your firewall allows it, at:"
          : "Reachable from this computer only, at:"}
      </p>
      <ul className="flex flex-col">
        {status.urls.map((url) => (
          <li key={url} className="font-mono break-all">
            {url}
          </li>
        ))}
      </ul>
      <p className="text-fg-muted">
        {status.servesWebApp
          ? "It serves the complete web app, so a browser opens easyImmerse at these addresses."
          : "It serves only the API, for easyImmerse apps on other devices."}
      </p>
    </>
  );
}
