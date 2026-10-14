// Acceptance tests for the target-state screens in docs/design/README.md (spec LL-DS).
// Each test is `fixme` until the screen it covers is implemented; the implementation
// session removes the `fixme` line and the reason. Selectors are the contract between the
// mockup and the implementation: `.family-bar`, `#matrix-filters`, `[data-finding]`.
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

test('matrix offers the five filters and separates missing coverage from nothing found', async ({ page }) => {
  test.fixme(true, 'waits for docs/design/screens/03-matrice.html: filter rail and coverage states (D-7)');
  await page.goto('/#matrice');
  const filters = page.locator('#matrix-filters');
  for (const name of ['domeniu', 'familie', 'ciclu', 'tip', 'calitate']) {
    await expect(filters.locator(`select[name="${name}"]`)).toBeVisible();
  }
  await expect(page.locator('#pane-matrice table')).toBeVisible();
  await filters.locator('select[name="domeniu"]').selectOption({ label: 'sănătate' });
  const empty = page.locator('#pane-matrice [data-coverage-state]');
  await expect(empty).toHaveAttribute('data-coverage-state', 'missing');
  await expect(empty).toContainText(/acoperire/i);
  await expect(empty).not.toContainText(/fără probleme|nicio problemă/i);
});

test('dossier finding shows source, quote, review state and keeps the hash behind details', async ({ page }) => {
  test.fixme(true, 'waits for docs/design/screens/04-dosar.html: finding anatomy (UX-6)');
  await page.goto('/#dosare');
  const finding = page.locator('[data-finding]').first();
  await expect(finding.locator('.finding-source a')).toHaveAttribute('href', /legislatie\.just\.ro|eur-lex\.europa\.eu/);
  await expect(finding.locator('blockquote')).not.toBeEmpty();
  await expect(finding.getByRole('radiogroup', { name: /stare/i })).toBeVisible();
  await expect(finding.locator('[data-reviewed-at]')).toHaveText(/\d{2}\.\d{2}\.\d{4}/);
  const details = finding.locator('details', { hasText: /SHA-256|sha256/ });
  await expect(details).not.toHaveAttribute('open', '');
  await expect(finding).not.toContainText(/\b(legal|ilegal|conform|constituțional)\b/i);
});
