import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DesktopPairingPanel } from "./DesktopPairingPanel.tsx";

const url = "http://192.168.1.5:8787";
const deviceName = "X's MacBook Pro";

const issued = {
  kind: "issued",
  code: { code: "482913", expires_at: Date.UTC(2026, 9, 22, 14, 32) },
} as const;

const meta = {
  title: "Pairing/DesktopPairingPanel",
  component: DesktopPairingPanel,
  decorators: [
    (Story) => (
      <div className="max-w-3xl bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    server: { kind: "running", url, hasAccounts: false, deviceName },
    code: issued,
    onStartServer: fn(),
    onNewCode: fn(),
  },
} satisfies Meta<typeof DesktopPairingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The desktop app could not read the server's state from its shell. */
export const ServerUnavailable: Story = {
  args: {
    server: {
      kind: "unavailable",
      message: "The server controls did not answer.",
    },
  },
};

export const ServerStopped: Story = { args: { server: { kind: "stopped" } } };

export const ServerStarting: Story = { args: { server: { kind: "starting" } } };

/** The server runs, but listens only on a loopback address, where no other device reaches it; starting it on the local network rebinds it. */
export const LoopbackOnly: Story = {
  args: { server: { kind: "loopbackOnly" } },
};

/** The server listens on every address, but this computer has no network connection, so no other device reaches it. */
export const NoNetwork: Story = {
  args: { server: { kind: "noNetwork" } },
};

/** A server with accounts shows no code: the other device logs in instead. */
export const WithAccounts: Story = {
  args: { server: { kind: "running", url, hasAccounts: true, deviceName } },
};

/** A computer whose name was cleared in the server settings, so the panel names none. */
export const WithoutDeviceName: Story = {
  args: {
    server: { kind: "running", url, hasAccounts: false, deviceName: "" },
  },
};

/** A server with the launch token, with its pairing code and the warning that anyone on the network can use it. */
export const WithLaunchToken: Story = {};

export const CodeLoading: Story = { args: { code: { kind: "loading" } } };

export const CodeFailed: Story = { args: { code: { kind: "failed" } } };
