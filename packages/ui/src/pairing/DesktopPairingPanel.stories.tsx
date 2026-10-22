import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DesktopPairingPanel } from "./DesktopPairingPanel.tsx";

const url = "http://192.168.1.5:8787";

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
    server: { kind: "running", url, hasAccounts: false },
    code: issued,
    onStartServer: fn(),
    onNewCode: fn(),
  },
} satisfies Meta<typeof DesktopPairingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ServerStopped: Story = { args: { server: { kind: "stopped" } } };

/** The server runs, but listens only on a loopback address, where no other device reaches it. */
export const LoopbackOnly: Story = {
  args: { server: { kind: "loopbackOnly" } },
};

/** A server with accounts shows no code: the other device logs in instead. */
export const WithAccounts: Story = {
  args: { server: { kind: "running", url, hasAccounts: true } },
};

/** A server with the launch token, with its pairing code and the warning that anyone on the network can use it. */
export const WithLaunchToken: Story = {};

export const CodeLoading: Story = { args: { code: { kind: "loading" } } };

export const CodeFailed: Story = { args: { code: { kind: "failed" } } };
