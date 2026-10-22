import {
  actions,
  selectDesktopServerLogs,
  selectDesktopServerSettingsForm,
  selectDesktopServerStatus,
  selectDoesDesktopServerUseAccounts,
  selectIsDesktopServerUnauthenticatedOnLan,
} from "@easyimmerse/state";
import { useId } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { formatServerLog } from "./formatServerLog.ts";
import { ServerAccountsInfo } from "./ServerAccountsInfo.tsx";
import { ServerLogList } from "./ServerLogList.tsx";
import { ServerSettingsForm } from "./ServerSettingsForm.tsx";
import { ServerStatusBlock } from "./ServerStatusBlock.tsx";
import { UnauthenticatedServerWarning } from "./UnauthenticatedServerWarning.tsx";

/**
 * The desktop app's server in Settings: its status with the buttons that start and stop it, a warning while anyone on the local network can use it,
 * its settings, what accounts can do once it has them, and its log.
 */
export function ServerSection() {
  const headingId = useId();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectDesktopServerStatus);
  const isUnauthenticatedOnLan = useAppSelector(
    selectIsDesktopServerUnauthenticatedOnLan,
  );
  const form = useAppSelector(selectDesktopServerSettingsForm);
  const usesAccounts = useAppSelector(selectDoesDesktopServerUseAccounts);
  const logs = useAppSelector(selectDesktopServerLogs);
  const showsAccounts =
    form.status === "loaded" && form.fields.auth === "accounts";
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-base font-semibold">
        Server
      </h2>
      <p className="text-sm text-fg-muted">
        The server lets phones, browsers and other computers on your local
        network use this app's projects, flashcards and dictionaries.
      </p>
      <ServerStatusBlock
        status={status}
        onStart={() => dispatch(actions.desktopServerStartRequested())}
        onStop={() => dispatch(actions.desktopServerStopRequested())}
      />
      {isUnauthenticatedOnLan && <UnauthenticatedServerWarning />}
      <ServerSettingsForm
        form={form}
        onChange={(changes) =>
          dispatch(actions.desktopServerSettingsChanged(changes))
        }
        onSave={() => dispatch(actions.desktopServerSettingsSubmitted())}
      />
      {showsAccounts && <ServerAccountsInfo isSaved={usesAccounts} />}
      <ServerLogList
        logs={logs}
        onRefresh={() => dispatch(actions.desktopServerLogsRefreshRequested())}
        onCopy={() =>
          dispatch(
            actions.textCopyRequested(
              formatServerLog(logs.entries ?? []),
              "server log",
            ),
          )
        }
      />
    </section>
  );
}
