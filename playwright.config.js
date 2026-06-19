import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tst",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5183",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --port 5183 --strictPort",
    url: "http://localhost:5183",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
