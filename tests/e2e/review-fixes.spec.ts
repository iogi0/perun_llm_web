import { expect, test } from "@playwright/test";
import { historyItem, newChat, openHistory, sendMessage, waitForReply } from "./helpers";

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the typing dots and the streaming caret do not animate", async ({ page }) => {
    await page.goto("/");
    await sendMessage(page, "Calm please");
    const dot = page.locator(".typing-dots span").first();
    await expect(dot).toHaveCSS("animation-name", "none");

    const caretAnimation = () =>
      page.evaluate(() => {
        const last = document.querySelector(".streaming-caret > :last-child");
        return last ? getComputedStyle(last, "::after").animationName : null;
      });
    await expect.poll(caretAnimation, { intervals: [20] }).not.toBeNull();
    expect(await caretAnimation()).toBe("none");
    await waitForReply(page);
  });
});

test.describe("two tabs", () => {
  test.skip(({ isMobile }) => isMobile, "Covered once on desktop");

  test("a second tab picks up chats saved by the first instead of overwriting them", async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto("/");
    await second.goto("/");

    await sendMessage(first, "From tab one");
    await waitForReply(first);
    await expect(historyItem(second, "From tab one")).toHaveCount(1);

    await newChat(second);
    await sendMessage(second, "From tab two");
    await waitForReply(second);
    await second.waitForTimeout(400);

    await first.reload();
    await openHistory(first);
    await expect(historyItem(first, "From tab one")).toHaveCount(1);
    await expect(historyItem(first, "From tab two")).toHaveCount(1);
  });
});
