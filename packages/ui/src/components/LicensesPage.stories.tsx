import type { Meta, StoryObj } from "@storybook/react-vite";
import { LicensesPage } from "./LicensesPage.tsx";

const mitText = `MIT License

Copyright (c) 2026 Example Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const meta = {
  title: "Components/LicensesPage",
  component: LicensesPage,
  args: { notices: [] },
  decorators: [
    (Story) => (
      <div className="w-[36rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LicensesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithNotices: Story = {
  args: {
    notices: [
      {
        title: "ffmpeg (LGPL build) — notice",
        text: "Version, source URL, configure flags and build origin go here, as the release tooling writes them.",
      },
      { title: "example-library (MIT)", text: mitText },
    ],
  },
};
