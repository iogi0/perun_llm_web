import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  retries: 1,
  forbidOnly: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    browserName: "chromium",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
  webServer: {
    command:
      "npm run build -- --mode test --outDir dist-e2e && npm run preview -- --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
  },
});
