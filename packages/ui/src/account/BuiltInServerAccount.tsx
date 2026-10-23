import { useGetSyncStatusQuery } from "@easyimmerse/backend";
import {
  type NativePlatform,
  selectAccountServerOptions,
  selectBundledServerPlatform,
} from "@easyimmerse/state";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { deviceNames } from "./deviceNames.ts";
import { RemoteAccountDetails } from "./RemoteAccountDetails.tsx";
import { SignInForm } from "./SignInForm.tsx";

/** How often the section asks the built-in server how copying the work to its remote fares. */
const syncStatusPollMs = 5000;

/**
 * The account of the native app, whose built-in server keeps the work on the device:
 * the form that logs in to a server to keep a copy of the work there as well, or the account on the server that keeps one.
 */
export function BuiltInServerAccount() {
  const status = useGetSyncStatusQuery(undefined, {
    pollingInterval: syncStatusPollMs,
  });
  const platform = useAppSelector(selectBundledServerPlatform) ?? "desktop";
  if (status.isError)
    return (
      <p role="alert" className="text-sm text-danger-fg">
        Couldn't tell whether a server keeps a copy of your work.
      </p>
    );
  if (status.data === undefined)
    return (
      <p className="text-sm text-fg-muted">
        Checking whether a server keeps a copy of your work…
      </p>
    );
  if (status.data.link === null) return <NotLinked platform={platform} />;
  return <RemoteAccountDetails link={status.data.link} platform={platform} />;
}

function NotLinked({ platform }: { platform: NativePlatform }) {
  const { hasOfficialServer } = useAppSelector(selectAccountServerOptions);
  const where = hasOfficialServer
    ? "the easyImmerse cloud"
    : "an easyImmerse server";
  return (
    <SignInForm
      intro={`Your work is currently saved only on ${deviceNames[platform]}. With an account on ${where}, you can back it up there and use it on your other devices.`}
    />
  );
}
