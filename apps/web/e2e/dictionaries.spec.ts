import path from "node:path";
import { expect, test } from "@playwright/test";

const dictionaryFixture = path.join(
  import.meta.dirname,
  "../../../fixtures/sample-yomitan.zip",
);

test("a dictionary added from a file appears in the dictionaries settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: /^Dictionaries/ }).click();
  const fileChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add from a file" }).first().click();
  await (await fileChooser).setFiles(dictionaryFixture);
  // The fixture states Japanese as its language, so it is listed under that heading.
  await expect(page.getByRole("region", { name: "Japanese" })).toContainText(
    "Sample Dictionary",
  );
});
