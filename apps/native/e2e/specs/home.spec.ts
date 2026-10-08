import { $, expect } from "@wdio/globals";

describe("the app's home screen", () => {
  it("lists the placeholder projects of a new database", async () => {
    await expect($('ul[aria-label="Projects"] button')).toBeDisplayed();
  });

  // The app starts in the system's theme, which differs between machines and times of day.
  it("switches to the other theme from the footer's menu", async () => {
    const themeBefore = await $("html").getAttribute("data-theme");
    const themeAfter = themeBefore === "dark" ? "light" : "dark";
    await $('button[aria-label^="Theme:"]').click();
    await $('[role="menu"]')
      .$(`button=${themeAfter === "dark" ? "Dark" : "Light"}`)
      .click();
    await expect($("html")).toHaveAttribute("data-theme", themeAfter);
  });
});
