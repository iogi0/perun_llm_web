import { expect, test } from "@playwright/test";
import { sendMessage, waitForReply } from "./helpers";

test("the mock reply shows a highlighted Python block", async ({ page }) => {
  await page.goto("/");
  await sendMessage(page, "Show code");
  await waitForReply(page);

  const code = page.locator("pre code.language-python");
  await expect(code).toHaveText('print("Hello from Perun LLM")');
  await expect(code.locator(".hljs-string")).toHaveText('"Hello from Perun LLM"');
  await expect(page.getByRole("log").getByText("python", { exact: true })).toBeVisible();
});

test("Copy writes the code to the clipboard and shows Copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await sendMessage(page, "Copy code");
  await waitForReply(page);

  await page.getByRole("log").getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("log").getByRole("button", { name: "Copy code" })).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'print("Hello from Perun LLM")\n',
  );
  await expect(page.getByRole("log").getByRole("button", { name: "Copy code" })).toContainText("Copy", {
    timeout: 4000,
  });
  await expect(page.getByRole("log").getByRole("button", { name: "Copy code" })).not.toContainText("Copied");
});

test("without the clipboard API, Copy selects the code and asks for Ctrl+C", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "clipboard", { get: () => undefined });
  });
  await page.goto("/");
  await sendMessage(page, "Copy on a LAN");
  await waitForReply(page);

  await page.getByRole("log").getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByText("Press Ctrl+C to copy", { exact: true }).first()).toBeVisible();
  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected.trimEnd()).toBe('print("Hello from Perun LLM")');
});
