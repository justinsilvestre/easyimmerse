import { actions } from "@easyimmerse/state";
import type {
  DesktopServerSettings,
  DesktopServerStatus,
  ServerLogEntry,
} from "@easyimmerse/types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { ServerScreen } from "./ServerScreen.tsx";

const settings: DesktopServerSettings = {
  bind: "0.0.0.0:8787",
  auth: "launch_token",
  open_signup: false,
  api_only: false,
  autostart: false,
  ffmpeg_dir: null,
  expected_hosts: [],
  device_name: "Justin's MacBook Pro",
};

const stopped: DesktopServerStatus = {
  state: { kind: "stopped" },
  urls: [],
  lan_reachable: false,
  serves_web_app: false,
  pairing_url: null,
};

const runningOnLan: DesktopServerStatus = {
  state: { kind: "running" },
  urls: ["http://192.168.1.5:8787", "http://studio.local:8787"],
  lan_reachable: true,
  serves_web_app: true,
  pairing_url: "http://192.168.1.5:8787",
};

const at = (seconds: number) => Date.UTC(2026, 9, 22, 14, 3, seconds);

const logs: ServerLogEntry[] = [
  {
    time_ms: at(1),
    level: "info",
    target: "easyimmerse_native::server_control",
    message: "Listening on 0.0.0.0:8787",
  },
  {
    time_ms: at(4),
    level: "warn",
    target: "easyimmerse_api::serve",
    message: "Refused a request for host 10.0.0.9:8787",
  },
  {
    time_ms: at(9),
    level: "error",
    target: "easyimmerse_media_ffmpeg",
    message: "ffmpeg exited with status 1 while converting episode-03.mkv",
  },
  {
    time_ms: at(12),
    level: "info",
    target: "easyimmerse_api::routes::pairing",
    message: "A pairing code was claimed",
  },
];

const loaded = (overrides: Partial<DesktopServerSettings> = {}) =>
  actions.desktopServerSettingsLoaded({ ...settings, ...overrides });

const meta = {
  title: "Server/ServerScreen",
  component: ServerScreen,
  decorators: [withAppStore],
  args: { onBack: fn() },
} satisfies Meta<typeof ServerScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stopped: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(stopped),
      loaded(),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

export const Starting: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        ...stopped,
        state: { kind: "starting" },
      }),
      loaded(),
      actions.desktopServerLogsReceived([]),
    ),
  ],
};

/** The server runs on a loopback address, where only this computer reaches it, so no warning shows. */
export const RunningOnLoopbackOnly: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        ...runningOnLan,
        urls: ["http://127.0.0.1:8787"],
        lan_reachable: false,
        pairing_url: null,
      }),
      loaded({ bind: "127.0.0.1:8787" }),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

/** The server listens on every address, but this computer has no network connection, so no other device reaches it. */
export const RunningWithoutNetwork: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        ...runningOnLan,
        urls: [],
        lan_reachable: false,
        pairing_url: null,
      }),
      loaded(),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

/** The server runs on the local network with only the launch token, so anyone there can use it. */
export const RunningOnLanWithoutAuthentication: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(runningOnLan),
      loaded(),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

export const RunningWithAccounts: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        ...runningOnLan,
        serves_web_app: false,
      }),
      loaded({ auth: "accounts", open_signup: true, api_only: true }),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

export const FailedToStart: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived({
        ...stopped,
        state: {
          kind: "failed",
          message:
            "The server could not listen on 0.0.0.0:8787: address already in use.",
        },
      }),
      loaded(),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

/** The device name was edited and not yet saved, which restarts the running server. */
export const DeviceNameEdited: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(runningOnLan),
      loaded(),
      actions.desktopServerSettingsChanged({ device_name: "Studio iMac" }),
      actions.desktopServerLogsReceived(logs.slice(0, 1)),
    ),
  ],
};

/** A change to the settings is being saved, which restarts the running server. */
export const Saving: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(runningOnLan),
      loaded(),
      actions.desktopServerSettingsChanged({ bind: "0.0.0.0:9000" }),
      actions.desktopServerSettingsSubmitted(),
      actions.desktopServerLogsReceived([]),
    ),
  ],
};

export const SaveFailed: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(runningOnLan),
      loaded(),
      actions.desktopServerSettingsChanged({ bind: "0.0.0.0:80" }),
      actions.desktopServerSettingsSubmitted(),
      actions.desktopServerRequestFailed(
        "saveSettings",
        "permission denied to listen on port 80",
      ),
      actions.desktopServerLogsReceived([]),
    ),
  ],
};

/** An address the person typed that the server cannot listen on, which keeps the form from being saved. */
export const InvalidAddress: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(stopped),
      loaded(),
      actions.desktopServerSettingsChanged({ bind: "localhost" }),
      actions.desktopServerLogsReceived([]),
    ),
  ],
};

export const LogWithWarningsAndErrors: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(runningOnLan),
      loaded(),
      actions.desktopServerLogsReceived(logs),
    ),
  ],
};

export const EmptyLog: Story = {
  decorators: [
    withDispatchedActions(
      actions.desktopServerStatusReceived(stopped),
      loaded(),
      actions.desktopServerLogsReceived([]),
    ),
  ],
};
