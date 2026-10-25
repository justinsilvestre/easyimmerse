import { useGetSyncStatusQuery } from "@easyimmerse/backend";
import {
  type AccountVia,
  selectServerConfig,
  selectServerName,
} from "@easyimmerse/state";
import { useAppSelector } from "../../useAppSelector.ts";

/** Names the server whose accounts the Users page lists: the server the app uses, this computer's own server, or the one the work is backed up to. */
export function UsersServerLine({ via }: { via: AccountVia }) {
  return via === "linkedRemote" ? <LinkedServerLine /> : <OwnServerLine />;
}

function OwnServerLine() {
  const server = useAppSelector(selectServerConfig);
  const name = useAppSelector((state) =>
    server ? selectServerName(state, server.serverUrl) : null,
  );
  if (server?.bundledIn !== undefined)
    return (
      <Line text="The accounts people use to sign in to this computer's server." />
    );
  return name === null ? null : <Line text={`The accounts on ${name}.`} />;
}

function LinkedServerLine() {
  const serverUrl = useGetSyncStatusQuery().data?.link?.server_url;
  const name = useAppSelector((state) =>
    serverUrl ? selectServerName(state, serverUrl) : null,
  );
  return name === null ? null : <Line text={`The accounts on ${name}.`} />;
}

function Line({ text }: { text: string }) {
  return <p className="text-sm text-fg-muted">{text}</p>;
}
