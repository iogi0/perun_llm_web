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
