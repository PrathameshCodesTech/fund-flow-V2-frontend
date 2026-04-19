import { test, expect } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Workflow Config Page", () => {
  test("should load /workflow-config and render the page", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/workflow-config");
    await page.waitForLoadState("networkidle");

    // Page title should be visible
    await expect(page.locator("text=Workflow Config")).toBeVisible();

    // The org selector should be present
    await expect(page.getByText("Organization")).toBeVisible();

    await context.close();
  });

  test("should navigate to workflow config and interact with add group dialog", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/workflow-config");
    await page.waitForLoadState("networkidle");

    // Click a draft version card to load its editor
    const draftCards = page.locator('[data-testid="draft-version-card"]');
    if (await draftCards.count() > 0) {
      await draftCards.first().click();
      await page.waitForLoadState("networkidle");
    }

    // Open "Add Group" dialog
    const addGroupButtons = page.getByRole("button", { name: /add group/i });
    if (await addGroupButtons.count() > 0) {
      await addGroupButtons.first().click();
      await expect(page.getByText("Add Approval Group")).toBeVisible({ timeout: 5000 });

      // Verify form fields are present
      await expect(page.locator('text=Group Name')).toBeVisible();
      await expect(page.locator('text=Approval Mode')).toBeVisible();
      await expect(page.locator('text=If Rejected')).toBeVisible();

      // Close the dialog
      await page.keyboard.press("Escape");
    }

    await context.close();
  });

  test("should render step kind controls when creating a step", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/workflow-config");
    await page.waitForLoadState("networkidle");

    // Click a draft version card to load its editor
    const draftCards = page.locator('[data-testid="draft-version-card"]');
    if (await draftCards.count() === 0) {
      test.skip();
    }
    await draftCards.first().click();
    await page.waitForLoadState("networkidle");

    // Open Add Step dialog
    const addStepButtons = page.getByRole("button", { name: /add step/i });
    await addStepButtons.first().click();
    await expect(page.getByText("Step Kind")).toBeVisible({ timeout: 5000 });

    // Switch to SPLIT_BY_SCOPE to expose split/join controls
    const stepKindSelect = page.locator('[data-testid="step-kind-select"]');
    await stepKindSelect.click();
    await page.getByRole("option", { name: /split/i }).click();

    // Split Target Mode control should appear
    await expect(page.getByText("Split Target Mode")).toBeVisible({ timeout: 5000 });

    // Switch to JOIN_BRANCHES to expose join policy control
    await stepKindSelect.click();
    await page.getByRole("option", { name: /join/i }).click();
    await expect(page.getByText("Join Policy")).toBeVisible({ timeout: 5000 });

    await context.close();
  });
});