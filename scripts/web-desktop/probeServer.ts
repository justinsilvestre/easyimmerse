/** Whether a server answers at an address: with success, with a refusal such as 401, or not at all. */
export type ServerProbe = "answering" | "refusing" | "absent";

/** Requests a route that requires the token; `/health` would answer without checking it. */
export async function probeServer(
  url: string,
  token: string,
): Promise<ServerProbe> {
  try {
    const response = await fetch(new URL("/projects", url), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    });
    return response.ok ? "answering" : "refusing";
  } catch {
    return "absent";
  }
}
