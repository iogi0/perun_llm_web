import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { composer, sendMessage, waitForReply } from "./helpers";

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`axe in ${colorScheme}`, () => {
    test.use({ colorScheme });

    test("empty chat has no serious or critical issues", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("How can I help you today?")).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test("filled chat has no serious or critical issues", async ({ page }) => {
      await page.goto("/");
      await sendMessage(page, "Check **contrast** and `code`");
      await waitForReply(page);
      await page.mouse.move(0, 0);
      expect(await seriousViolations(page)).toEqual([]);
    });

    test("open dialogs have no serious or critical issues", async ({ page }) => {
      await page.goto("/");
      await sendMessage(page, "Dialog check");
      await waitForReply(page);
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) await menu.click();
      const item = page.getByRole("navigation", { name: "Chat history" }).getByRole("listitem");
      await item.hover();
      await item.getByRole("button", { name: "Delete conversation" }).click();
      await expect(page.getByRole("dialog", { name: "Delete conversation?" })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

test.describe("keyboard only", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard pass runs with a fine pointer");

  async function tabTo(page: Page, matches: () => Promise<boolean>) {
    for (let step = 0; step < 30; step += 1) {
      await page.keyboard.press("Tab");
      if (await matches()) return;
    }
    throw new Error("Tab never reached the target.");
  }

  test("Tab to the composer, type, Enter, then Tab to Copy and press it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await tabTo(page, () => composer(page).evaluate((element) => element === document.activeElement));
    await page.keyboard.type("Keyboard only");
    await page.keyboard.press("Enter");
    await waitForReply(page);

    const copy = page.getByRole("log").getByRole("button", { name: "Copy code" });
    await page.locator("body").focus();
    await tabTo(page, () => copy.evaluate((element) => element === document.activeElement));
    expect(await copy.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    await expect(copy).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("Enter");
    await expect(copy).toContainText("Copied");
  });
});
