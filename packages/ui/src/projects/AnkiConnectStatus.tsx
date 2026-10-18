import type { AnkiConnectionStatus } from "@easyimmerse/state";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { LinkButton } from "../components/LinkButton.tsx";
import { Switch } from "../components/Switch.tsx";

/** What the status badge tells: the connection to Anki, or that the last sync failed while Anki stays connected. */
export type ChannelStatus = AnkiConnectionStatus | "syncFailed";

/**
 * Groups, under a label that names them all, the switch that turns AnkiConnect off, the status badge,
 * the way to check or try again, and, while Anki cannot be used, how to reach it with a link to the setup steps.
 */
export function AnkiConnectStatus({
  status,
  isSyncing,
  deniedOrigin,
  onCheckConnection,
  onTryAgain,
  onSetUpAnkiConnect,
  onTurnOff,
}: {
  status: ChannelStatus;
  isSyncing: boolean;
  /** The origin Anki refused, when it refuses easyImmerse and the origin is known. */
  deniedOrigin: string | null;
  onCheckConnection: () => void;
  onTryAgain: () => void;
  onSetUpAnkiConnect: () => void;
  onTurnOff: () => void;
}) {
  const isUnconnected = status === "unreachable" || status === "denied";
  return (
    <fieldset className="flex w-full min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-fg-muted">
        AnkiConnect status
      </legend>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            label="On"
            accessibleLabel="AnkiConnect on for this project"
            checked
            onChange={onTurnOff}
          />
          {statusBadges[status]}
          <StatusAction
            status={status}
            isSyncing={isSyncing}
            onCheckConnection={onCheckConnection}
            onTryAgain={onTryAgain}
          />
        </div>
        {isUnconnected && (
          <ConnectionHint
            status={status}
            deniedOrigin={deniedOrigin}
            onSetUpAnkiConnect={onSetUpAnkiConnect}
          />
        )}
      </div>
    </fieldset>
  );
}

/**
 * Checks the connection again while Anki cannot be used, and tries a failed sync again.
 * While Anki is connected, it says so when a send is under way and otherwise offers nothing, since a send starts by itself.
 */
function StatusAction({
  status,
  isSyncing,
  onCheckConnection,
  onTryAgain,
}: {
  status: ChannelStatus;
  isSyncing: boolean;
  onCheckConnection: () => void;
  onTryAgain: () => void;
}) {
  if (status === "checking") return null;
  if (status === "connected")
    return isSyncing ? <span className="text-fg-muted">Sending…</span> : null;
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={status === "syncFailed" ? onTryAgain : onCheckConnection}
    >
      <RefreshCw className="size-4" aria-hidden />
      {status === "syncFailed" ? "Try again" : "Check again"}
    </Button>
  );
}

const statusBadges = {
  checking: <Badge>Checking Anki…</Badge>,
  connected: <Badge tone="success">Anki connected</Badge>,
  syncFailed: <Badge tone="danger">Sync failed</Badge>,
  unreachable: <Badge tone="danger">Anki unreachable</Badge>,
  denied: <Badge tone="danger">Anki refused easyImmerse</Badge>,
} satisfies Record<ChannelStatus, ReactNode>;

/**
 * Tells how to connect to Anki when the last check did not, ending with a link to the setup steps.
 * AnkiConnect asks again each time a page it refused checks, unless the user chose to ignore that page's origin, which its config then lists.
 * When that origin is not known, emptying the list is the step that still works.
 */
function ConnectionHint({
  status,
  deniedOrigin,
  onSetUpAnkiConnect,
}: {
  status: "unreachable" | "denied";
  deniedOrigin: string | null;
  onSetUpAnkiConnect: () => void;
}) {
  const setupLink = (
    <LinkButton onClick={onSetUpAnkiConnect}>Show the setup steps</LinkButton>
  );
  if (status === "unreachable")
    return (
      <p className="text-fg-muted">
        Start Anki with the AnkiConnect add-on installed, then check again.{" "}
        {setupLink}
      </p>
    );
  return (
    <div className="flex flex-col items-start gap-1.5 text-fg-muted">
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        <li>Check again and choose Yes when Anki asks.</li>
        <li>
          If Anki does not ask, open Tools &gt; Add-ons in Anki, select
          AnkiConnect, and choose Config.
        </li>
        <li>
          {deniedOrigin === null ? (
            <>
              Empty <Code>ignoreOriginList</Code>.
            </>
          ) : (
            <>
              Remove <Code>{deniedOrigin}</Code> from{" "}
              <Code>ignoreOriginList</Code>.
            </>
          )}
        </li>
        <li>Check again.</li>
      </ol>
      {setupLink}
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono">{children}</code>;
}
