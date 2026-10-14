import type { AnkiConnection } from "@easyimmerse/state";
import type { AnkiConnect } from "./ankiConnect.ts";
import { ankiConnectActions } from "./ankiConnectActions.ts";

/** Asks Anki for AnkiConnect's version. Anki not answering, refusing this page or answering with an error all count as not connected. */
export async function checkAnkiConnection(
  anki: AnkiConnect,
): Promise<{ data: AnkiConnection }> {
  try {
    const version = await anki.invoke<number>(ankiConnectActions.version());
    return { data: { connected: true, version } };
  } catch {
    return { data: { connected: false } };
  }
}
