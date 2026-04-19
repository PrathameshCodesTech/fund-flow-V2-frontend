import { test, expect } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Login", () => {
  test("should load login page and show form elements", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();

    await context.close();
  });

  test("should redirect to home after successful login", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, "admin");

    await expect(page).toHaveURL(/\//);
    // Authenticated shell: V2Shell renders a nav sidebar with Home link
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "People" })).toBeVisible();

    await context.close();
  });
});