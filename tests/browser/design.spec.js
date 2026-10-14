// Acceptance tests for the target-state screens in docs/design/README.md (spec LL-DS).
// A test is `fixme` until the screen it covers is implemented. Screens 03 and 04 landed with
// their own tests in the static suite, which runs on the fixtures build (this suite serves a
// synthetic one-act corpus, so the matrix has no rows here): `tests/browser/matrix.spec.js`
// (filter rail `#matrix-filters`, table, coverage states) and `tests/browser/dossier.spec.js`
// (finding anatomy `[data-finding]`). Screen 01 waits for the hub URL (D-1): `.family-bar`.
import { test, expect } from '@playwright/test';

test('family bar links back to the hub on every pane', async ({ page }) => {
  test.fixme(true, 'waits for docs/design/screens/01-start.html: family bar (D-1), hub URL is a human decision');
  await page.goto('/');
  const bar = page.locator('.family-bar');
  await expect(bar).toBeVisible();
  const hub = bar.getByRole('link', { name: /toate proiectele/i });
  await expect(hub).toHaveAttribute('href', /^https:\/\//);
  expect((await hub.boundingBox()).height).toBeGreaterThanOrEqual(24);
  await expect(bar).toContainText(/Linter legislativ/);
  await page.locator('#tab-lint').click();
  await expect(bar).toBeVisible();
});
