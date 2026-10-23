import type { Effects } from "@easyimmerse/state";

/** Tauri's `invoke`: calls a command of the native shell, which rejects with its reason as text. */
export type Invoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

/** Tauri's `listen`: calls the handler with each event's payload, and resolves with a function that stops listening. */
export type Listen = <T>(
  event: string,
  handler: (event: { payload: T }) => void,
) => Promise<() => void>;

/** The event the native shell emits with the server's status whenever it changes. */
export const desktopServerStatusEvent = "desktop-server-status";

/** The server controls through which the desktop app's page manages the server the app runs. */
export type DesktopServerControls = Pick<
  Effects,
  | "readDesktopServerSettings"
  | "saveDesktopServerSettings"
  | "startDesktopServer"
  | "stopDesktopServer"
  | "readDesktopServerStatus"
  | "readDesktopServerLogs"
  | "subscribeToDesktopServerStatus"
>;

type AnswerOf<K extends keyof DesktopServerControls> = Awaited<
  ReturnType<DesktopServerControls[K]>
>;

type DesktopServerStatus = AnswerOf<"readDesktopServerStatus">;

/**
 * Builds the server controls over the given Tauri `invoke` and `listen`, so tests can supply fakes.
 * A refused command rejects with an error that carries the shell's reason as its message.
 */
export function createDesktopServerControls(
  invoke: Invoke,
  listen: Listen,
): DesktopServerControls {
  const call = <T>(command: string, args?: Record<string, unknown>) =>
    invoke<T>(command, args).catch((reason: unknown) => {
      throw new Error(reasonOf(reason));
    });
  return {
    readDesktopServerSettings: () =>
      call<AnswerOf<"readDesktopServerSettings">>(
        "get_desktop_server_settings",
      ),
    saveDesktopServerSettings: (settings) =>
      call<DesktopServerStatus>("save_desktop_server_settings", { settings }),
    startDesktopServer: () => call<DesktopServerStatus>("start_desktop_server"),
    stopDesktopServer: () => call<DesktopServerStatus>("stop_desktop_server"),
    readDesktopServerStatus: () =>
      call<DesktopServerStatus>("get_desktop_server_status"),
    readDesktopServerLogs: () =>
      call<AnswerOf<"readDesktopServerLogs">>("get_desktop_server_logs"),
    subscribeToDesktopServerStatus: (listener) => {
      const stopListening = listen<DesktopServerStatus>(
        desktopServerStatusEvent,
        (event) => listener(event.payload),
      );
      return () => {
        void stopListening.then((stop) => stop());
      };
    },
  };
}

function reasonOf(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  return "The server controls did not answer.";
}
