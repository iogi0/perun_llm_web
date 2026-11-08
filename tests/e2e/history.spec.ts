import { expect, test } from "@playwright/test";
import {
  closeDrawerIfOpen,
  confirmDialog,
  composer,
  deleteChat,
  historyItem,
  newChat,
  openChat,
  openHistory,
  sendMessage,
  waitForReply,
} from "./helpers";

const log = (page: import("@playwright/test").Page) => page.getByRole("log");
const emptyGreeting = "How can I help you today?";

test("two chats keep their own messages when switching", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "First chat");
  await waitForReply(page);
  await newChat(page);
  await expect(page.getByText(emptyGreeting)).toBeVisible();
  await sendMessage(page, "Second chat");
  await waitForReply(page);

  await openChat(page, "First chat");
  await expect(log(page)).toContainText("First chat");
  await expect(log(page)).not.toContainText("Second chat");

  await openChat(page, "Second chat");
  await expect(log(page)).toContainText("Second chat");
  await expect(log(page)).not.toContainText("First chat");
});

test("new chat reuses an empty conversation", async ({ page }) => {
  await page.goto("/");
  await newChat(page);
  await newChat(page);
  await openHistory(page);
  await expect(historyItem(page, "New chat")).toHaveCount(1);
});

test("deleting the active chat opens the next, and deleting the last shows the empty state", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Keep me");
  await waitForReply(page);
  await newChat(page);
  await sendMessage(page, "Delete me");
  await waitForReply(page);

  await deleteChat(page, "Delete me");
  await closeDrawerIfOpen(page);
  await expect(log(page)).toContainText("Keep me");

  await deleteChat(page, "Keep me");
  await closeDrawerIfOpen(page);
  await expect(page.getByText(emptyGreeting)).toBeVisible();
});

test("cancelling the dialog keeps the chat", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Still here");
  await waitForReply(page);
  await openHistory(page);
  const item = historyItem(page, "Still here");
  await item.hover();
  await item.getByRole("button", { name: "Delete conversation" }).click();
  await expect(confirmDialog(page).getByText("This can't be undone.")).toBeVisible();
  await confirmDialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(confirmDialog(page)).toBeHidden();
  await expect(item).toHaveCount(1);
});

test("reload restores the chats and the open one", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Older chat");
  await waitForReply(page);
  await newChat(page);
  await sendMessage(page, "Newer chat");
  await waitForReply(page);
  await openChat(page, "Older chat");
  await closeDrawerIfOpen(page);
  await expect(log(page)).toContainText("Older chat");
  await page.waitForTimeout(400);

  await page.reload();
  await expect(log(page)).toContainText("Older chat");
  await expect(log(page)).toContainText("Demo reply");
  await openHistory(page);
  await expect(historyItem(page, "Newer chat")).toHaveCount(1);
});

test("a reply that was streaming at reload comes back as stopped", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Interrupted");
  await expect(log(page)).toContainText("Demo reply");
  await page.reload();
  await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
});

test("switching away during a stream never writes into the other chat", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Empty neighbour");
  await waitForReply(page);
  await newChat(page);
  await sendMessage(page, "Streaming chat");
  await expect(page.getByRole("button", { name: "Stop generating" })).toBeVisible();

  await openChat(page, "Empty neighbour");
  await expect(log(page)).not.toContainText("Streaming chat");
  await composer(page).fill("Blocked while streaming");
  await expect(page.getByRole("button", { name: "Stop generating" })).toBeVisible();
  await waitForReply(page);
  await expect(log(page)).not.toContainText("Streaming chat");
  await expect(log(page).getByText("Demo reply", { exact: true })).toHaveCount(1);

  await openChat(page, "Streaming chat");
  await expect(log(page)).toContainText("Hello from Perun LLM");
});

test("deleting during a stream ends it and leaves other chats alone", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Survivor");
  await waitForReply(page);
  await newChat(page);
  await sendMessage(page, "Doomed");
  await expect(page.getByRole("button", { name: "Stop generating" })).toBeVisible();

  await deleteChat(page, "Doomed");
  await closeDrawerIfOpen(page);
  await waitForReply(page);
  await expect(log(page)).toContainText("Survivor");
  await expect(log(page).getByText("Demo reply", { exact: true })).toHaveCount(1);
  await page.waitForTimeout(400);
  await expect(log(page)).not.toContainText("Doomed");
  await page.reload();
  await openHistory(page);
  await expect(historyItem(page, "Doomed")).toHaveCount(0);
});

test.describe("broken storage", () => {
  test("corrupt data opens an empty app", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perun-llm:v1", "{corrupt"));
    await page.goto("/");
    await expect(page.getByText(emptyGreeting)).toBeVisible();
  });

  test("blocked writes keep the app working and show one notice", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Full", "QuotaExceededError");
      };
    });
    await page.goto("/");
    await sendMessage(page, "In memory");
    await waitForReply(page);
    await expect(log(page)).toContainText("In memory");
    await expect(page.getByText("History can't be saved in this browser.")).toHaveCount(1);
  });

  test("a blocked localStorage getter does not crash the app", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
    });
    await page.goto("/");
    await expect(page.getByText(emptyGreeting)).toBeVisible();
    await sendMessage(page, "Still works");
    await waitForReply(page);
    await expect(page.getByText("History can't be saved in this browser.")).toBeVisible();
  });
});

test("a long chat title is truncated inside the sidebar", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "How do I read a CSV file in Python with headers and types?");
  await waitForReply(page);
  await openHistory(page);
  const overflow = await page
    .getByRole("navigation", { name: "Chat history" })
    .evaluate((nav) => nav.scrollWidth - nav.clientWidth);
  expect(overflow).toBe(0);
  await expect(page.getByRole("navigation", { name: "Chat history" }).getByRole("button", { name: "Delete conversation" })).toBeInViewport({ ratio: 1 });
});
