import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TranslationPopup } from "./TranslationPopup.tsx";

const meta = {
  title: "Reader/TranslationPopup",
  component: TranslationPopup,
  parameters: { layout: "centered" },
  args: {
    text: "El perro quiere comer. Tiene hambre.",
    language: "es",
    onClose: fn(),
  },
} satisfies Meta<typeof TranslationPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShortSentence: Story = {};

export const LongPassage: Story = {
  args: {
    text: "Cuando Gregor Samsa se despertó una mañana después de un sueño intranquilo, se encontró sobre su cama convertido en un monstruoso insecto.",
  },
};
