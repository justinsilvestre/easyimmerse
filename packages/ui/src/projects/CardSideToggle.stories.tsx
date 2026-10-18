import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CheckboxField } from "../components/CheckboxField.tsx";
import { CardSideToggle } from "./CardSideToggle.tsx";

const meta = {
  title: "Projects/CardSideToggle",
  component: CardSideToggle,
  decorators: [
    (Story) => (
      <div className="flex w-48 items-start justify-between gap-2">
        <CheckboxField label="Sentence audio" defaultChecked />
        <Story />
      </div>
    ),
  ],
  args: { fieldLabel: "Sentence audio", isFront: true, onToggle: fn() },
} satisfies Meta<typeof CardSideToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTheFront: Story = {};

export const OnTheBack: Story = { args: { isFront: false } };
