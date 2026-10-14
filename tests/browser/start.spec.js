import { test, expect } from '@playwright/test';

// Design screen 01 (docs/design/README.md) and D-4: the fixtures build is marked as demo data in
// the header's provenance line, with the status word from ux-guidelines § 7.
test('header badge marks the fixtures build as demo data', async ({ page }) => {
  await page.goto('/');
  const stat = page.locator('#stat');
  await expect(stat).toContainText('4 acte');
  const badge = stat.locator('[data-dataset-status]');
  await expect(badge).toHaveAttribute('data-dataset-status', 'demonstrative');
  await expect(badge).toHaveText('Date demonstrative');
  await expect(badge).toHaveAttribute('role', 'status');
  // One status word only (ux-guidelines § 7), and the date next to it.
  await expect(stat.locator('[data-dataset-status]')).toHaveCount(1);
  await expect(stat).not.toContainText('Date reale');
  await expect(stat.locator('[data-dataset-date]')).toBeVisible();
});
