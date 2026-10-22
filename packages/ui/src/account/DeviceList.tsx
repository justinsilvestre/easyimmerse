import { useListSessionsQuery } from "@easyimmerse/backend";
import {
  actions,
  describeDevice,
  selectAccountVia,
  selectDeviceLogOutFailureMessage,
  selectIsLoggingOutDevice,
  selectIsSigningOut,
  selectIsUnlinking,
} from "@easyimmerse/state";
import type { SessionSummary } from "@easyimmerse/types";
import { useId } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { formatRelativeDate } from "../projects/formatRelativeDate.ts";

/** The devices the account is logged in on, each with a button that logs it out. */
export function DeviceList() {
  const headingId = useId();
  const sessions = useListSessionsQuery(useAppSelector(selectAccountVia));
  const failure = useAppSelector(selectDeviceLogOutFailureMessage);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-semibold">
        Devices
      </h3>
      {failure !== null && (
        <p role="alert" className="text-sm text-danger-fg">
          {failure}
        </p>
      )}
      {sessions.isError ? (
        <p className="text-sm text-danger-fg">
          Couldn't list the devices this account is logged in on.
        </p>
      ) : sessions.data === undefined ? (
        <p className="text-sm text-fg-muted">Listing the devices…</p>
      ) : (
        <ul
          aria-labelledby={headingId}
          className="flex max-w-lg flex-col divide-y divide-line"
        >
          {sessions.data.sessions.map((session) => (
            <DeviceRow key={session.id} session={session} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeviceRow({ session }: { session: SessionSummary }) {
  const dispatch = useAppDispatch();
  // This device logs out as the account section's own button does, which first confirms dropping the flashcards not yet saved.
  const isLoggingOut = useAppSelector((state) =>
    session.is_current
      ? selectIsSigningOut(state) || selectIsUnlinking(state)
      : selectIsLoggingOutDevice(state, session.id),
  );
  const device = describeDevice(session.user_agent);
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          {device}
          {session.is_current && <Badge tone="accent">This device</Badge>}
        </span>
        <span className="text-xs text-fg-muted">
          Logged in {formatRelativeDate(session.created_at_ms)}. Last used{" "}
          {formatRelativeDate(session.last_used_at_ms)}.
        </span>
      </div>
      <Button
        size="sm"
        aria-label={
          session.is_current ? "Log out this device" : `Log out ${device}`
        }
        aria-disabled={isLoggingOut}
        onClick={() => {
          if (isLoggingOut) return;
          dispatch(
            session.is_current
              ? actions.signOutRequested()
              : actions.deviceLogOutRequested(session.id, false),
          );
        }}
      >
        {isLoggingOut ? "Logging out…" : "Log out"}
      </Button>
    </li>
  );
}
