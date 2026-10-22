import {
  actions,
  type NativePlatform,
  selectIsSignInFormStarted,
  selectIsSyncRunRequested,
} from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { deviceNames } from "./deviceNames.ts";
import { formatSinceTime } from "./formatSinceTime.ts";
import { hostOf } from "./hostOf.ts";
import { SignInForm } from "./SignInForm.tsx";

/** Explains why the work is not being copied to the linked server, if it is not, and offers what can be done about it. */
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
      return null;
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
