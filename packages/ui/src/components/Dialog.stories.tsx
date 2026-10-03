import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "./Button.tsx";
import { Dialog } from "./Dialog.tsx";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Remove dictionary?",
    description: "Flashcards already made with it keep their definitions.",
    onClose: fn(),
    footer: (
      <>
        <Button>Cancel</Button>
        <Button variant="danger">Remove</Button>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmation: Story = {};

export const WithContent: Story = {
  args: {
    title: "Choose an audio track",
    description: undefined,
    children: <p className="text-sm">The dialog's content goes here.</p>,
    footer: <Button variant="primary">Use this track</Button>,
  },
};
