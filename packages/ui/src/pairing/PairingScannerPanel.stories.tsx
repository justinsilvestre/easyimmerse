import { actions } from "@easyimmerse/state";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withAppStore } from "../storybook/withAppStore.tsx";
import { withDispatchedActions } from "../storybook/withDispatchedActions.tsx";
import { PairingScannerPanel } from "./PairingScannerPanel.tsx";

const desktop = "http://192.168.1.5:8787";

const filledIn = actions.pairingFormChanged({
  address: "192.168.1.5:8787",
  code: "482913",
});

const checked = (accounts: boolean) =>
  actions.pairingServerChecked(desktop, { accounts, open_signup: false });

/** The steps up to the claim of the code at a server without accounts. */
const claiming = [filledIn, actions.pairingSubmitted(), checked(false)];

const mobileApp = {
  appStore: {
    server: {
      serverUrl: "http://127.0.0.1:1",
      token: "launch-token",
      bundledIn: "mobile",
    },
  },
} as const;

const meta = {
  title: "Pairing/PairingScannerPanel",
  component: PairingScannerPanel,
  decorators: [
    (Story) => (
      <div className="bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
    withAppStore,
  ],
} satisfies Meta<typeof PairingScannerPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The web app, in a browser that can read QR codes through its camera only on a secure page. */
export const Empty: Story = {};

/** The mobile app, which scans with its own scanner. */
export const MobileApp: Story = { parameters: mobileApp };

/** The mobile app while its scanner is open. */
export const MobileAppScanning: Story = {
  parameters: mobileApp,
  decorators: [withDispatchedActions(actions.pairingScanRequested())],
};

export const FilledIn: Story = {
  decorators: [withDispatchedActions(filledIn)],
};

export const CheckingServer: Story = {
  decorators: [withDispatchedActions(filledIn, actions.pairingSubmitted())],
};

export const Claiming: Story = {
  decorators: [withDispatchedActions(...claiming)],
};

export const WrongOrExpiredCode: Story = {
  decorators: [
    withDispatchedActions(
      ...claiming,
      actions.pairingFailed({
        status: 404,
        code: "pairing_code_invalid",
        message: "the pairing code is wrong or has expired",
      }),
    ),
  ],
};

export const UsedCode: Story = {
  decorators: [
    withDispatchedActions(
      ...claiming,
      actions.pairingFailed({
        status: 409,
        code: "pairing_code_used",
        message: "the pairing code has been used",
      }),
    ),
  ],
};

export const TooManyWrongCodes: Story = {
  decorators: [
    withDispatchedActions(
      ...claiming,
      actions.pairingFailed({
        status: 429,
        code: "too_many_attempts",
        message: "too many failed pairing attempts",
        retryAfterSeconds: 600,
      }),
    ),
  ],
};

export const ServerUnreachable: Story = {
  decorators: [
    withDispatchedActions(
      filledIn,
      actions.pairingSubmitted(),
      actions.pairingFailed({ status: "NETWORK", message: "Failed to fetch" }),
    ),
  ],
};

export const CodeMissing: Story = {
  decorators: [
    withDispatchedActions(
      actions.pairingFormChanged({ address: desktop }),
      actions.pairingSubmitted(),
      checked(false),
    ),
  ],
};

/** The browser refused the camera, or the mobile app's scanner may not use it. */
export const CameraUnavailable: Story = {
  parameters: mobileApp,
  decorators: [
    withDispatchedActions(
      actions.pairingScanRequested(),
      actions.pairingScanCancelled("cameraUnavailable"),
    ),
  ],
};

export const UnrecognizedQrCode: Story = {
  parameters: mobileApp,
  decorators: [
    withDispatchedActions(
      actions.pairingScanRequested(),
      actions.pairingCodeScanned("WIFI:S:Home;T:WPA;P:secret;;"),
    ),
  ],
};
