import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PairingScannerForm } from "./PairingScannerForm.tsx";

/** Stands in for the camera picture, which a story cannot open. */
const cameraPlaceholder = (
  <div className="flex aspect-square w-64 items-center justify-center rounded-lg bg-black text-sm text-white">
    Camera
  </div>
);

const meta = {
  title: "Pairing/PairingScannerForm",
  component: PairingScannerForm,
  decorators: [
    (Story) => (
      <div className="bg-canvas p-4 text-fg">
        <Story />
      </div>
    ),
  ],
  args: {
    form: {
      address: "",
      code: "",
      status: "idle",
      isBusy: false,
      canSubmit: false,
      message: null,
    },
    canScan: true,
    camera: cameraPlaceholder,
    onChange: fn(),
    onSubmit: fn(),
    onScan: fn(),
  },
} satisfies Meta<typeof PairingScannerForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A browser that can read QR codes through its camera, before the scan. */
export const BrowserThatCanScan: Story = {};

/** The same browser while the camera looks for the QR code. */
export const BrowserScanning: Story = {
  args: {
    form: {
      address: "",
      code: "",
      status: "scanning",
      isBusy: true,
      canSubmit: false,
      message: null,
    },
  },
};
