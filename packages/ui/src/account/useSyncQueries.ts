import {
  useGetCurrentPrincipalQuery,
  useGetServerAuthInfoQuery,
  useGetSyncStatusQuery,
  useListProjectsQuery,
} from "@easyimmerse/backend";
import { selectWorkHome } from "@easyimmerse/state";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** How often the built-in server is asked how syncing with its remote fares. */
const syncStatusPollMs = 5000;

/** Keeps cached what decides where the work is kept: the built-in server's projects and sync status, or who the token belongs to on a server reached over the network. */
export function useSyncQueries() {
  const workHome = useAppSelector(selectWorkHome);
  const isOnBuiltInServer = workHome === "builtInServer";
  const isOnNetworkServer = workHome === "accountServer";
  useListProjectsQuery(undefined, { skip: !isOnBuiltInServer });
  useGetSyncStatusQuery(undefined, {
    pollingInterval: syncStatusPollMs,
    skip: !isOnBuiltInServer,
  });
  useGetCurrentPrincipalQuery("self", { skip: !isOnNetworkServer });
  useGetServerAuthInfoQuery("self", { skip: !isOnNetworkServer });
}
