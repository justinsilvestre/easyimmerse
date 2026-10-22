import { hostOf } from "./hostOf.ts";

/** How the copy names the easyImmerse cloud, which most people use, in place of its address. */
const cloudName = "the easyImmerse cloud";

/** Names a server as the copy refers to it: the easyImmerse cloud by that name, and any other server by its host. */
export function serverNameOf(
  serverUrl: string,
  cloudUrl: string | null,
): string {
  return isCloudServer(serverUrl, cloudUrl) ? cloudName : hostOf(serverUrl);
}

/** Tells whether a server is the easyImmerse cloud. */
export function isCloudServer(
  serverUrl: string,
  cloudUrl: string | null,
): boolean {
  return cloudUrl !== null && trimmed(serverUrl) === trimmed(cloudUrl);
}

function trimmed(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
