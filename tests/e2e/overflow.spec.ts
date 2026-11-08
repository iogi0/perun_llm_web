import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const longWord = "x".repeat(300);
const wideTable = `| ${Array.from({ length: 12 }, (_, i) => `Column ${i + 1}`).join(" | ")} |\n|${" --- |".repeat(12)}\n| ${Array.from({ length: 12 }, () => "unbreakable_cell_value").join(" | ")} |`;
const longCode = `\`\`\`python\nresult = ${"compute_something_long(".repeat(12)}${")".repeat(12)}\n\`\`\``;
const reply = [`Long word: ${longWord}`, "", wideTable, "", longCode, "", `[${"link".repeat(60)}](https://example.com/${"path/".repeat(40)})`].join("\n");

async function seed(page: Page) {
  await page.addInitScript((content) => {
    const at = "2026-01-01T00:00:00.000Z";
    localStorage.setItem(
      "perun-llm:v1",
      JSON.stringify({
        version: 1,
        activeId: "c",
        conversations: [
          {
            id: "c",
            title: "Overflow",
            createdAt: at,
            updatedAt: at,
            messages: [
              { id: "u", role: "user", content: "y".repeat(300), createdAt: at, status: "complete" },
              { id: "a", role: "assistant", content, createdAt: at, status: "complete", origin: "mock" },
            ],
          },
        ],
      }),
    );
  }, reply);
}

async function expectNoPageScroll(page: Page) {
  const sizes = await page.evaluate(() => {
    const log = document.querySelector('[role="log"]');
    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      log: log ? log.scrollWidth - log.clientWidth : 0,
    };
  });
  expect(sizes).toEqual({ page: 0, body: 0, log: 0 });
}

for (const width of [null, 320]) {
  test(`long words, wide tables and long code never scroll the page${width ? ` at ${width} px` : ""}`, async ({ page }) => {
    if (width) await page.setViewportSize({ width, height: 700 });
    await seed(page);
    await page.goto("/");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoPageScroll(page);

    const scrollsInside = await page.evaluate(() =>
      ["table", "pre"].map((selector) => {
        const element = document.querySelector(selector);
        const box = selector === "table" ? element?.parentElement : element;
        return box ? box.scrollWidth > box.clientWidth : false;
      }),
    );
    expect(scrollsInside).toEqual([true, true]);
  });
}
