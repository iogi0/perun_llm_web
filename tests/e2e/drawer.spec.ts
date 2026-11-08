import { expect, test } from "@playwright/test";
import { sendMessage, waitForReply } from "./helpers";

test.skip(({ isMobile }) => !isMobile, "The drawer replaces the sidebar below 1024 px");

const menu = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Open menu" });
const drawer = (page: import("@playwright/test").Page) => page.getByRole("dialog", { name: "Menu" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the sidebar is hidden and the top bar shows the menu button", async ({ page }) => {
  await expect(menu(page)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Chat history" })).toHaveCount(0);
});

test("Escape closes the drawer and returns focus to the menu button", async ({ page }) => {
  await menu(page).click();
  await expect(drawer(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await expect(menu(page)).toBeFocused();
});

test("a backdrop click closes the drawer and returns focus", async ({ page }) => {
  await menu(page).click();
  await expect(drawer(page)).toBeVisible();
  const viewport = page.viewportSize();
  await page.mouse.click((viewport?.width ?? 390) - 10, (viewport?.height ?? 844) / 2);
  await expect(drawer(page)).toBeHidden();
  await expect(menu(page)).toBeFocused();
});

test("choosing a chat closes the drawer, opens the chat and returns focus", async ({ page }) => {
  await sendMessage(page, "Drawer chat");
  await waitForReply(page);
  await menu(page).click();
  await drawer(page).getByRole("button", { name: "New chat" }).first().click();
  await expect(drawer(page)).toBeHidden();
  await expect(page.getByText("How can I help you today?")).toBeVisible();

  await menu(page).click();
  await drawer(page).getByRole("button", { name: "Drawer chat" }).click();
  await expect(drawer(page)).toBeHidden();
  await expect(page.getByRole("log")).toContainText("Drawer chat");
  await expect(menu(page)).toBeFocused();
  await expect(page.locator("main > header")).toContainText("Drawer chat");
});

test("the drawer is at most 320 px wide and takes 85% of a phone screen", async ({ page }) => {
  await menu(page).click();
  const box = await drawer(page).boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box?.width).toBeLessThanOrEqual(320);
  expect(box?.width).toBeCloseTo(Math.min(width * 0.85, 320), 0);
});

test("delete controls in the drawer are always visible and 44 px touch targets", async ({ page }) => {
  await sendMessage(page, "Touch chat");
  await waitForReply(page);
  await menu(page).click();
  const remove = drawer(page).getByRole("button", { name: "Delete conversation" });
  await expect(remove).toBeVisible();
  await expect(remove).toHaveCSS("opacity", "1");
  const box = await remove.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
});
