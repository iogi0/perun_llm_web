import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export function composer(page: Page) {
  return page.getByRole("textbox", { name: "Message Perun LLM" });
}

export async function sendMessage(page: Page, text: string) {
  await composer(page).fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
}

export async function waitForReply(page: Page) {
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
}

export function historyItem(page: Page, title: string) {
  return page
    .getByRole("navigation", { name: "Chat history" })
    .getByRole("listitem")
    .filter({ hasText: title });
}

export async function openHistory(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

export async function newChat(page: Page) {
  await openHistory(page);
  await page.getByRole("button", { name: "New chat" }).first().click();
}

export async function openChat(page: Page, title: string) {
  await openHistory(page);
  await historyItem(page, title).getByRole("button", { name: title }).click();
}

export async function deleteChat(page: Page, title: string) {
  await openHistory(page);
  const item = historyItem(page, title);
  await item.hover();
  await item.getByRole("button", { name: "Delete conversation" }).click();
  await confirmDialog(page).getByRole("button", { name: "Delete", exact: true }).click();
}

export async function closeDrawerIfOpen(page: Page) {
  const drawer = page.locator("dialog[data-drawer][open]");
  if (await drawer.count()) await page.keyboard.press("Escape");
}

export function confirmDialog(page: Page) {
  return page.getByRole("dialog", { name: "Delete conversation?" });
}
