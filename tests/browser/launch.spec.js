const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

test("served game renders and supports draw then undo", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Klondike" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Stock, 24 cards/ })).toBeVisible();

  await page.getByRole("button", { name: /Stock/ }).click();
  await expect(page.locator("#waste .card")).toHaveCount(1);
  await expect(page.locator("#moves")).toHaveText("1");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#waste .card")).toHaveCount(0);
  await expect(page.locator("#moves")).toHaveText("0");

  await page.keyboard.press("H");
  await expect(page.locator("#status")).toContainText(/Hint|No legal hint/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hint" }).click();
  await expect(page.locator("#status")).toContainText(/Hint|No legal hint/);

  expect(errors).toEqual([]);
});

test("direct file launch renders without server-only dependencies", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(pathToFileURL(path.resolve("index.html")).href);
  await expect(page.getByRole("heading", { name: "Klondike" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Stock, 24 cards/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hint" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Auto-Finish" })).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(28);
  await expect(page.locator("body")).toHaveCSS("min-height", "720px");
  expect(errors).toEqual([]);
});
