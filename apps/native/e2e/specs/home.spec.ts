import { $, expect } from "@wdio/globals";

describe("the app's home screen", () => {
  it("lists the placeholder projects of a new database", async () => {
    await expect($('ul[aria-label="Projects"] button')).toBeDisplayed();
  });

  it("switches to the dark theme from the footer", async () => {
    await $('button[role="switch"]').click();
    await expect($("html")).toHaveAttribute("data-theme", "dark");
  });
});
