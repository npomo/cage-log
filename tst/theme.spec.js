import { test, expect } from "@playwright/test";
import { freshLoad, waitReady } from "./helpers.js";

test("defaults to dark mode and toggles to light", async ({ page }) => {
  await freshLoad(page);
  await expect(page.locator(".wrap")).not.toHaveClass(/light/);

  await page.click(".theme-toggle");
  await expect(page.locator(".wrap")).toHaveClass(/light/);

  await page.click(".theme-toggle");
  await expect(page.locator(".wrap")).not.toHaveClass(/light/);
});

test("theme choice persists across reload", async ({ page }) => {
  await freshLoad(page);
  await page.click(".theme-toggle");
  await expect(page.locator(".wrap")).toHaveClass(/light/);

  await page.reload();
  await waitReady(page);
  await expect(page.locator(".wrap")).toHaveClass(/light/);
});
