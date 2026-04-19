import { Page, BrowserContext } from "@playwright";

// Demo seed users from NewBackend/apps/core/management/commands/seed_v2_demo.py
// All use password: Password@123
const DEMO_USERS = [
  { email: "tenantadmin@demo.local", password: "Password@123", label: "admin" },
  { email: "entitymanager.x@demo.local", password: "Password@123", label: "entity_manager_x" },
  { email: "marketinghead@demo.local", password: "Password@123", label: "marketing_head" },
] as const;

export type DemoUserLabel = (typeof DEMO_USERS)[number]["label"];

export async function login(
  context: BrowserContext,
  userLabel: DemoUserLabel = "admin"
): Promise<Page> {
  const user = DEMO_USERS.find((u) => u.label === userLabel)!;
  const page = await context.newPage();

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL("**/");

  // Wait for the authenticated shell — sidebar nav with "Home" link confirms
  // the V2Shell has rendered and the user is fully authenticated
  await page.waitForSelector('[href="/"]', { timeout: 10_000 });
  await page.waitForLoadState("networkidle");

  return page;
}

export async function loginAndGetStorageState(
  userLabel: DemoUserLabel = "admin"
): Promise<string> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await login(context, userLabel);

  const storageState = await context.storageState();
  await browser.close();
  return JSON.stringify(storageState);
}