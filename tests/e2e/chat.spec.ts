import { expect, test } from "@playwright/test";
import { composer, sendMessage, waitForReply } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("send shows typing, then a labelled demo reply", async ({ page }) => {
  await sendMessage(page, "Hello Perun");

  await expect(page.getByRole("log").getByText("Hello Perun", { exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Generating reply" })).toBeVisible();
  await expect(page.getByText("Demo reply", { exact: true })).toBeVisible();
  await waitForReply(page);
  await expect(page.getByRole("status", { name: "Generating reply" })).toHaveCount(0);
  await expect(page.getByRole("log")).toContainText("No language model is connected yet");
  await expect(page.getByRole("log")).toContainText("Hello from Perun LLM");
});

test("stop ends the reply and shows Stopped", async ({ page }) => {
  await sendMessage(page, "Stop me");
  await page.getByRole("button", { name: "Stop generating" }).click();

  await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
  await expect(composer(page)).toBeEnabled();
  await waitForReply(page);
});

test("/error shows the error and Retry runs the request again", async ({ page }) => {
  await sendMessage(page, "/error please");

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("The server could not be reached.");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("status", { name: "Generating reply" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("The server could not be reached.");
  await expect(page.getByRole("alert")).toHaveCount(1);
});

test("send is disabled for empty text", async ({ page }) => {
  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toBeDisabled();
  await composer(page).fill("   ");
  await expect(send).toBeDisabled();
  await composer(page).fill("hello");
  await expect(send).toBeEnabled();
});

test("a counter appears above 7,000 characters and 8,001 blocks sending", async ({ page }) => {
  await composer(page).fill("a".repeat(7000));
  await expect(page.getByText("7,000 / 8,000")).toHaveCount(0);
  await composer(page).fill("a".repeat(7001));
  await expect(page.getByText("7,001 / 8,000")).toBeVisible();
  await composer(page).fill("a".repeat(8001));
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test.describe("keyboard with a fine pointer", () => {
  test.skip(({ isMobile }) => isMobile, "Enter adds a new line on touch devices");

  test("Enter sends and focus stays in the composer", async ({ page }) => {
    await composer(page).fill("Sent with Enter");
    await composer(page).press("Enter");
    await expect(page.getByRole("log").getByText("Sent with Enter", { exact: true })).toBeVisible();
    await expect(composer(page)).toBeFocused();
    await expect(composer(page)).toHaveValue("");
  });

  test("Shift+Enter adds a new line", async ({ page }) => {
    await composer(page).fill("one");
    await composer(page).press("Shift+Enter");
    await expect(composer(page)).toHaveValue("one\n");
    await expect(page.getByRole("log")).toHaveCount(0);
  });

  test("Enter during IME composition does not send", async ({ page }) => {
    await composer(page).fill("かな");
    await composer(page).evaluate((element) => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true }),
      );
    });
    await expect(page.getByRole("log")).toHaveCount(0);
    await expect(composer(page)).toHaveValue("かな");
  });

  test("Enter does nothing while a reply is streaming", async ({ page }) => {
    await sendMessage(page, "First");
    await composer(page).fill("Second");
    await composer(page).press("Enter");
    await expect(composer(page)).toHaveValue("Second");
  });
});

test.describe("keyboard with a coarse pointer", () => {
  test.skip(({ isMobile }) => !isMobile, "Only touch devices change Enter");

  test("Enter adds a new line", async ({ page }) => {
    await composer(page).fill("one");
    await composer(page).press("Enter");
    await expect(composer(page)).toHaveValue("one\n");
    await expect(page.getByRole("log")).toHaveCount(0);
  });
});
