import { expect, test } from "@playwright/test";
import { sendMessage, waitForReply } from "./helpers";

// Saves screenshots for the visual review in screenshots/ (git-ignored).
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} screenshots`, () => {
    test.use({ colorScheme });

    test("empty and filled chat", async ({ page }, testInfo) => {
      const name = (state: string) =>
        `screenshots/${testInfo.project.name}-${colorScheme}-${state}.png`;

      await page.goto("/");
      await expect(page.getByText("How can I help you today?")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: name("empty") });

      await sendMessage(page, "How do I read a CSV file in Python?");
      await waitForReply(page);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: name("filled") });

      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) {
        await menu.click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: name("drawer") });
      }
    });
  });
}
