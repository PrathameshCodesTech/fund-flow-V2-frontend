import { test, expect } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Tasks Page", () => {
  test("should load /tasks and show a task list or empty state", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Page title or header should be visible
    await expect(page.getByRole("heading", { name: "Approval Tasks" })).toBeVisible({ timeout: 10000 });

    // Either a task list with cards, or "No tasks" empty state
    const taskCards = page.locator('[data-testid="task-card"]');
    const emptyState = page.getByText(/pending tasks/i);

    const hasCards = await taskCards.count() > 0;
    const hasEmpty = await emptyState.count() > 0;

    expect(hasCards || hasEmpty).toBeTruthy();

    await context.close();
  });

  test("should render task cards with action buttons", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    // Wait for tasks to load or empty state
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 10000 }).catch(() => {
      // no task cards — empty state is fine
    });

    const taskCards = page.locator('[data-testid="task-card"]');
    const count = await taskCards.count();

    if (count > 0) {
      // Each card should have action buttons
      await expect(taskCards.first().locator('button').filter({ hasText: /approve/i }).first()).toBeVisible();
      await expect(taskCards.first().locator('button').filter({ hasText: /reject/i }).first()).toBeVisible();
    }

    await context.close();
  });

  test("should open approve dialog when approve button is clicked", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await page.goto("/tasks");
    await page.waitForLoadState("networkidle");

    await page.waitForSelector('[data-testid="task-card"]', { timeout: 10000 }).catch(() => {
      // no task cards — empty state is fine
    });

    const taskCards = page.locator('[data-testid="task-card"]');
    if (await taskCards.count() > 0) {
      const approveBtn = taskCards.first().locator('button').filter({ hasText: /approve/i }).first();
      await approveBtn.click();

      // Approve dialog should appear (title or note field)
      await expect(
        page.locator('text=/approve|confirm|note/i').first()
      ).toBeVisible({ timeout: 5000 });

      // Close it
      await page.keyboard.press("Escape");
    } else {
      // No tasks — empty state visible
      await expect(page.getByText(/pending tasks/i)).toBeVisible();
    }

    await context.close();
  });
});