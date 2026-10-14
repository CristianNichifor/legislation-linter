import { test, expect } from '@playwright/test';

// Design screen 04 (docs/design/README.md, criterion 5) and UX-6: one finding in a dossier reads
// source, quote, reasoning and review state in that order, keeps its hash behind <details>, and
// says nothing that sounds like a verdict. The dossier is created through the UI, so the test
// runs on the real static app with nothing pre-seeded.
const QUOTE = 'autoritatea contractantă are obligația de a lua toate măsurile necesare pentru a preveni, identifica și remedia situațiile de conflict de interese';
const SOURCE = 'https://legislatie.just.ro/Public/DetaliiDocument/178667';
const HASH = '9e96ff1c5b0d4a3f8c2e7b6a1d0f9e8c7b6a5d4c3b2a1f0e9d8c7b6a5f4e3d2c';

async function createDossierWithNote(page, { reasoning = true } = {}) {
  await page.goto('/#dosare');
  await expect(page.locator('#dossier-library')).toHaveAttribute('open', '');
  const create = page.locator('#dossier-create');
  await create.locator('xpath=..').evaluate(details => { details.open = true; });
  await create.locator('input[name="titlu"]').fill('Achiziții publice');
  await create.locator('button[type="submit"]').click();
  const form = page.locator('#dossier-notes [data-manual-note-form]');
  await expect(form.locator('input[name="title"]')).toBeVisible();
  await form.locator('input[name="title"]').fill('Clarificare între interdicția cumulului și conflictul de interese');
  await form.locator('select[name="type"]').selectOption('necorelare');
  await form.locator('input[name="act_id"]').fill('lege-98-2016');
  await form.locator('input[name="locator"]').fill('art. 58');
  await form.locator('input[name="source_url"]').fill(SOURCE);
  await form.locator('input[name="source_hash"]').fill(HASH);
  await form.locator('textarea[name="evidence_quote"]').fill(QUOTE);
  if (reasoning) {
    await form.locator('textarea[name="reasoning"]').fill('Textul proiectului poate dubla obligația fără a o contrazice; de verificat în textul sursă.');
  }
  await form.locator('button[type="submit"]').click();
  const finding = page.locator('#dossier-notes [data-finding]').first();
  await expect(finding).toBeVisible();
  return finding;
}

test('dossier finding shows source, quote, review state and keeps the hash behind details', async ({ page }) => {
  const finding = await createDossierWithNote(page);
  // Act and locator, quote, source, reasoning, state, hash: in that DOM order.
  const order = await finding.evaluate(node => ['.finding-target', 'blockquote', '.finding-source', '.finding-reasoning', '[data-note-review]', 'details.finding-tech']
    .map(sel => { const el = node.querySelector(sel); return el ? [...node.querySelectorAll('*')].indexOf(el) : -1; }));
  expect(order.every(i => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await expect(finding.locator('.finding-source a')).toHaveAttribute('href', /legislatie\.just\.ro|eur-lex\.europa\.eu/);
  await expect(finding.locator('.finding-source a')).toHaveText('legislatie.just.ro/Public/DetaliiDocument/178667');
  await expect(finding.locator('blockquote')).toContainText(QUOTE);
  await expect(finding.getByRole('radiogroup', { name: /stare/i })).toBeVisible();
  await expect(finding.locator('[data-reviewed-at]')).toHaveText(/\d{2}\.\d{2}\.\d{4}/);
  const details = finding.locator('details', { hasText: /SHA-256/ });
  await expect(details).not.toHaveAttribute('open', '');
  await expect(details).toContainText(HASH);
  await expect(finding).not.toContainText(/\b(legal|ilegal|conform|constituțional)\b/i);
  // The hash is not printed outside the details.
  const outside = await finding.evaluate(node => { const clone = node.cloneNode(true); clone.querySelectorAll('details').forEach(d => d.remove()); return clone.textContent; });
  expect(outside).not.toContain(HASH.slice(0, 12));
});

test('review state is saved from the finding and survives a reload', async ({ page }) => {
  const finding = await createDossierWithNote(page);
  const group = finding.getByRole('radiogroup', { name: /stare/i });
  await expect(group.getByRole('radio', { name: 'Ciornă' })).toBeChecked();
  await group.getByRole('radio', { name: 'Rezolvată' }).check();
  await expect(page.locator('#dossier-notes [data-note-list-status]')).toContainText('Starea notei a fost salvată.');
  const saved = page.locator('#dossier-notes [data-finding]').first();
  await expect(saved.locator('[data-note-status]')).toHaveText('Rezolvată');
  await expect(saved.getByRole('radio', { name: 'Rezolvată' })).toBeChecked();
  // The chosen dossier is not remembered across a reload; pick it again and read the stored state.
  await page.reload();
  await expect(page.locator('#dossier-library')).toHaveAttribute('open', '');
  await page.locator('#dossier-select').selectOption({ label: 'Achiziții publice' });
  await expect(page.locator('#dossier-notes [data-finding]').first().locator('[data-note-status]')).toHaveText('Rezolvată');
});

test('a note without reasoning cannot be marked reviewed from the finding', async ({ page }) => {
  const finding = await createDossierWithNote(page, { reasoning: false });
  const group = finding.getByRole('radiogroup', { name: /stare/i });
  // click(), not check(): the app puts the previous state back at once, which check() reads as
  // "the click changed nothing".
  await group.getByRole('radio', { name: 'Auto-revizuită' }).click();
  await expect(page.locator('#dossier-notes [data-note-list-status]')).toContainText('fără: raționament');
  await expect(group.getByRole('radio', { name: 'Ciornă' })).toBeChecked();
  await expect(finding.locator('[data-note-status]')).toHaveText('Ciornă');
});
