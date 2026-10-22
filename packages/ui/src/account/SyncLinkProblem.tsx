import {
  actions,
  hostOf,
  type NativePlatform,
  selectIsSignInFormStarted,
  selectIsSyncRunRequested,
} from "@easyimmerse/state";
import type { RefusedUpload, SyncLink } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { deviceNames } from "./deviceNames.ts";
import { formatSinceTime } from "./formatSinceTime.ts";
import { SignInForm } from "./SignInForm.tsx";

/** Explains why the work, or one of its media files, is not being copied to the linked server, if it is not, and offers what can be done about it. */
export function SyncLinkProblem({
  link,
  platform,
}: {
  link: SyncLink;
  platform: NativePlatform;
}) {
  const host = hostOf(link.server_url);
  const device = deviceNames[platform];
  switch (link.state.kind) {
    case "idle":
    case "syncing":
      return (
        link.refused_upload && (
          <p className="max-w-lg text-sm text-warning-fg">
            {refusedUploadText(link.refused_upload, host)}
          </p>
        )
      );
    case "unreachable":
      return (
        <Problem
          text={`Couldn't reach ${host} since ${formatSinceTime(link.state.since_ms)}. Your work is kept on ${device} and will be copied there when the server can be reached.`}
        >
          <TryAgain />
        </Problem>
      );
    case "failed":
      return (
        <Problem
          text={`Your work is kept on ${device} until it can be copied to ${host}.`}
        >
          <p className="text-xs text-fg-muted">Details: {link.state.message}</p>
          <TryAgain />
        </Problem>
      );
    case "logged_out":
      return (
        <Problem
          text={`You were logged out of ${host} on ${device}, so your work isn't being copied there.`}
        >
          <LogInAgain link={link} />
        </Problem>
      );
  }
}

function refusedUploadText(refused: RefusedUpload, host: string) {
  const prefix = `Couldn't keep a copy of ${refused.name} on ${host}`;
  switch (refused.code) {
    case "quota_exceeded":
      return `${prefix}: there isn't enough room there.`;
    case "uploads_unavailable":
      return `${prefix}: it doesn't keep copies of media files.`;
    default:
      return `${prefix}: ${refused.message}.`;
  }
}

function Problem({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="flex max-w-lg flex-col items-start gap-2">
      <p className="text-sm text-warning-fg">{text}</p>
      {children}
    </div>
  );
}

function TryAgain() {
  const dispatch = useAppDispatch();
  const isRequested = useAppSelector(selectIsSyncRunRequested);
  return (
    <Button
      aria-disabled={isRequested}
      onClick={() => {
        if (!isRequested) dispatch(actions.syncRunRequested());
      }}
    >
      {isRequested ? "Trying again…" : "Try again"}
    </Button>
  );
}

/** Fills in the form to log in to the linked server again, then shows it. */
function LogInAgain({ link }: { link: SyncLink }) {
  const dispatch = useAppDispatch();
  const isFormStarted = useAppSelector(selectIsSignInFormStarted);
  if (isFormStarted) return <SignInForm />;
  return (
    <Button
      variant="primary"
      onClick={() =>
        dispatch(actions.relinkRequested(link.server_url, link.account_email))
      }
    >
      Log in again
    </Button>
  );
}
