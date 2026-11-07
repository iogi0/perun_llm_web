import { expect, test } from "@playwright/test";

const canvasColour = {
  light: "rgb(252, 252, 253)",
  dark: "rgb(21, 23, 28)",
} as const;

for (const colorScheme of ["light", "dark"] as const) {
  test(`uses the ${colorScheme} tokens from the OS colour scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      canvasColour[colorScheme],
    );
  });
}

test("loads the self-hosted font and makes no third-party requests", async ({
  page,
  baseURL,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const faces = await page.evaluate(async () => {
    const loaded = await document.fonts.load('16px "Onest Variable"');
    return loaded.length;
  });

  expect(faces).toBeGreaterThan(0);
  const origin = new URL(baseURL ?? "").origin;
  const thirdParty = requested.filter(
    (url) => url.startsWith("http") && new URL(url).origin !== origin,
  );
  expect(thirdParty).toEqual([]);
});
