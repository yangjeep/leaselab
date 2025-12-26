import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'password';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', adminEmail);
  await page.fill('input[name="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin/);
}

test.describe('Admin sidebar layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('user profile is visible without scrolling', async ({ page }) => {
    const profile = page.getByTestId('sidebar-user-profile');
    await expect(profile).toBeVisible();

    const fitsViewport = await profile.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    expect(fitsViewport).toBe(true);
  });
});
