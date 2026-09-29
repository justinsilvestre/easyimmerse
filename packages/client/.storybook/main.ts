import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  stories: ["../src/**/*.stories.tsx"],
};

export default config;
