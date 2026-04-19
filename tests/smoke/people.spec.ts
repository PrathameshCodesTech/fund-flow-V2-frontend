import { test, expect } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("People Page", () => {
  test("should load /people, open add dialog, and create a person", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/people");
    await page.waitForLoadState("networkidle");

    // Shell should be loaded (V2Shell renders the page title)
    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();

    // Click "Add Person" button (visible in the shell header)
    const addButton = page.getByRole("button", { name: /add person/i });
    await addButton.click();

    // Dialog should open
    await expect(page.getByRole("heading", { name: "Add Person" })).toBeVisible();
    await expect(page.getByText("Create a new person account")).toBeVisible();

    // Fill the form using accessible labels and inputs
    const timestamp = Date.now();
    const email = `smoke.${timestamp}@test.local`;

    await page.fill('input[id="ap-first"]', "Smoke");
    await page.fill('input[id="ap-last"]', "Test");
    await page.fill('input[id="ap-email"]', email);
    await page.fill('input[id="ap-emp"]', `EMP-${timestamp}`);

    // Submit
    await page.getByRole("button", { name: /add person/i }).last().click();

    // Wait for success toast
    await expect(page.getByText("Person added successfully")).toBeVisible({ timeout: 8000 });

    // Dialog should close (wait for dialog heading to disappear)
    await expect(page.getByRole("heading", { name: "Add Person" })).not.toBeVisible();

    // New person should appear in the list
    await expect(page.locator(`text=${email}`).first()).toBeVisible();

    await context.close();
  });

  test("should show person list and select a person", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/people");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "People" })).toBeVisible();

    // Search input should exist
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // Filter select should exist
    await expect(page.getByText("All status")).toBeVisible();

    // People list should have loaded (count text visible)
    await expect(page.getByText(/\d+ people?/)).toBeVisible({ timeout: 10000 });

    await context.close();
  });
});