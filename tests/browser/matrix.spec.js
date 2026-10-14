import { test, expect } from '@playwright/test';

// Design screen 03 (docs/design/README.md, criterion 4) and D-7: the matrix offers the five
// filters under one rail, renders as a table (the text alternative to the graph) and tells a
// domain with no acts in the corpus apart from a filter that found no problem.
test('matrix offers the five filters and separates missing coverage from nothing found', async ({ page }) => {
  await page.goto('/#matrice');
  const filters = page.locator('#matrix-filters');
  for (const name of ['domeniu', 'familie', 'ciclu', 'tip', 'calitate']) {
    await expect(filters.locator(`select[name="${name}"]`)).toBeVisible();
  }
  const table = page.locator('#pane-matrice table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(7);
  await expect(table.locator('tbody tr').first()).toBeVisible();
  // The first cell is a button that opens the row's detail.
  const expand = table.locator('tbody tr').first().locator('.matrix-expand');
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  await expect(expand).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#m-detalii')).toContainText('semnale verificabile');
  // A domain the fixtures do not cover is missing coverage, not an absence of problems.
  await filters.locator('select[name="domeniu"]').selectOption({ label: 'sănătate' });
  const empty = page.locator('#pane-matrice [data-coverage-state]');
  await expect(empty).toHaveAttribute('data-coverage-state', 'missing');
  await expect(empty).toContainText(/acoperire/i);
  await expect(empty).toContainText('sănătate');
  await expect(empty).not.toContainText(/fără probleme|nicio problemă/i);
  await expect(table).toHaveCount(0);
  // Clearing the filters brings the table back.
  await page.locator('#m-reset').click();
  await expect(filters.locator('select[name="domeniu"]')).toHaveValue('');
  await expect(page.locator('#pane-matrice table tbody tr').first()).toBeVisible();
});
