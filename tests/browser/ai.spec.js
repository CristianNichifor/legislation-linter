import { test, expect } from '@playwright/test';

// LL-9: the evidence-to-draft flow with the user's own provider (BYOK), end to end in the real
// static app. The provider is the test server itself (tests/browser/serve_static.py, the
// /byok-mock/ routes), reached through the endpoint field the settings pane offers for a proxy or
// a self-hosted provider, so no key and no text leave the test. A page.route mock was tried
// first: WebKit never handed these requests to it, neither cross-origin (the preflight went to
// the real api.openai.com) nor same-origin (the POST reached the static server), so the stand-in
// lives in the server and every engine runs the same HTTP.
const PROVIDER_PATH = '/byok-mock/v1/chat/completions';
const KEY = 'sk-test-fleet-never-sent-anywhere';
const QUOTE = 'Prezenta lege reglementează modul de realizare a achizițiilor publice.';

// Settings live on another pane, and leaving the dossier pane re-renders the note form (WebKit
// does it late enough to race a click), so the provider is configured before the dossier exists.
async function setOnlineProvider(page, { key = KEY, seconds = 5 } = {}) {
  await page.goto('/#consolidat');
  await expect(page.locator('#stat')).toContainText('4 acte');
  await page.locator('#ai-mode').selectOption('online');
  await page.locator('#ai-provider').selectOption('openai');
  await expect(page.locator('#ai-key')).toBeVisible();
  await page.locator('#ai-endpoint').fill(new URL(PROVIDER_PATH, page.url()).href);
  await page.locator('#ai-key').fill(key);
  await page.locator('#ai-timeout').fill(String(seconds));
  await expect(page.locator('#ai-contract')).toContainText(key ? 'cheie în sesiune' : 'cheie lipsă');
}

async function openDossierWithEvidence(page) {
  await page.evaluate(() => { location.hash = 'dosare'; });
  await expect(page.locator('#dossier-library')).toHaveAttribute('open', '');
  const create = page.locator('#dossier-create');
  // The "Dosar nou" section may already be open when no dossier exists; opening is idempotent.
  await create.locator('xpath=..').evaluate(details => { details.open = true; });
  await create.locator('input[name="titlu"]').fill('Dosar AI BYOK');
  await create.locator('button[type="submit"]').click();
  const form = page.locator('#dossier-notes [data-manual-note-form]');
  await expect(form.locator('input[name="title"]')).toBeVisible();
  await form.locator('input[name="title"]').fill('Termen de aprobare');
  await form.locator('input[name="act_id"]').fill('lege-98-2016');
  await form.locator('input[name="locator"]').fill('art. 1');
  await form.locator('input[name="source_url"]').fill('https://legislatie.just.ro/Public/DetaliiDocument/178667');
  await form.locator('textarea[name="evidence_quote"]').fill(QUOTE);
  const panel = form.locator('[data-ai-note-draft]');
  await panel.evaluate(details => { details.open = true; });
  await panel.locator('select[name="ai_boundary"]').selectOption('online_byok');
  return { form, panel };
}

async function preparePrompt(panel) {
  await panel.locator('[data-ai-draft-note]').click();
  await expect(panel.locator('[data-ai-draft-status]')).toContainText('Prompt verificat: 1 dovezi');
  const card = panel.locator('[data-ai-boundary-card]');
  await expect(card).toContainText('online BYOK');
  await expect(card).toContainText('lege-98-2016 / art. 1');
  await expect(card).toContainText('Aprobare externă: obligatorie');
  await expect(panel.locator('[data-ai-send-note]')).toBeEnabled();
}

// Picks the provider's answer for the calls that follow and clears the recorded ones.
async function providerMode(page, mode) {
  const response = await page.request.get(`/byok-mock/mode/${mode}`);
  expect(response.ok()).toBe(true);
}

// What the app sent since the last providerMode: [{ headers, body }], oldest first.
async function providerCalls(page) {
  const response = await page.request.get('/byok-mock/calls');
  expect(response.ok()).toBe(true);
  return response.json();
}

async function run(panel, page, { accept = true } = {}) {
  const dialogs = [];
  page.once('dialog', dialog => { dialogs.push(dialog.message()); return accept ? dialog.accept() : dialog.dismiss(); });
  await panel.locator('[data-ai-send-note]').click();
  await expect.poll(() => dialogs.length).toBe(1);
  expect(dialogs[0]).toContain('Aprobi trimiterea promptului la furnizorul tău BYOK?');
  expect(dialogs[0]).toContain('Furnizor: OpenAI / gpt-5-mini');
  expect(dialogs[0]).toContain('Dovezi: 1');
  expect(dialogs[0]).not.toContain(KEY);
  return dialogs[0];
}

test('byok draft from evidence: consent, provider call, audit and citations', async ({ page }) => {
  test.setTimeout(240_000);
  await setOnlineProvider(page);
  await providerMode(page, 'ok');
  const { panel } = await openDossierWithEvidence(page);
  await preparePrompt(panel);
  // Declining the consent sends nothing.
  await run(panel, page, { accept: false });
  await expect(panel.locator('[data-ai-draft-status]')).toContainText('Anulat — promptul nu a fost trimis.');
  expect(await providerCalls(page)).toEqual([]);
  // Accepting it sends the prompt once, with the key as a header, to the chosen endpoint only.
  await run(panel, page);
  const result = panel.locator('[data-ai-draft-result]');
  await expect(result).toContainText('[Ciornă AI · online_byok · OpenAI / gpt-5-mini ·');
  const calls = await providerCalls(page);
  expect(calls).toHaveLength(1);
  expect(calls[0].headers.authorization).toBe(`Bearer ${KEY}`);
  expect(calls[0].body.model).toBe('gpt-5-mini');
  expect(JSON.stringify(calls[0].body)).toContain(QUOTE);
  expect(JSON.stringify(calls[0].body)).not.toContain(KEY);
  // The audit entry is stored and shown; the draft keeps its citations to the selected evidence.
  await expect(result).toContainText('Audit: ai-draft-storage-audit-v1 · online_byok · server_calls_model=false · status=draft_unreviewed');
  await expect(result).toContainText('Conform [1], legea reglementează');
  await expect(panel.locator('[data-ai-guardrail-summary]')).toHaveAttribute('data-ai-guardrail-status', 'ok');
  await expect(panel.locator('[data-ai-guardrail-summary]')).toContainText('afirmații nesusținute: 0');
  await expect(panel.locator('[data-ai-draft-status]')).toContainText('Ciornă generată și audit salvat');
  await expect(panel.locator('[data-ai-insert-note]')).toBeEnabled();
  // The key lives in the session only, never in durable app data.
  const durable = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(durable).not.toContain(KEY);
  expect(await page.evaluate(() => sessionStorage.getItem('ai_key_openai'))).toBe(KEY);
});

test('byok failure states: missing key, rejected key, quota and timeout create no draft', async ({ page }) => {
  test.setTimeout(240_000);
  await setOnlineProvider(page, { key: '' });
  await providerMode(page, 'bad_key');
  const { panel } = await openDossierWithEvidence(page);
  const guardrail = panel.locator('[data-ai-guardrail-summary]');
  const status = panel.locator('[data-ai-draft-status]');
  const result = panel.locator('[data-ai-draft-result]');
  const expectFailure = async label => {
    await expect(guardrail).toHaveAttribute('data-ai-guardrail-status', 'failed');
    await expect(guardrail).toContainText(`AI oprit · ${label}`);
    await expect(guardrail).toContainText('ciornă creată: nu');
    await expect(result).toContainText('Nu s-a creat nicio ciornă.');
    await expect(status).toContainText('Generarea AI a fost oprită; nu există ciornă de inserat.');
    await expect(panel.locator('[data-ai-insert-note]')).toBeDisabled();
  };
  // No key in the session: the app refuses before any request leaves the browser.
  await preparePrompt(panel);
  const unexpected = [];
  const noConsent = dialog => { unexpected.push(dialog.message()); return dialog.dismiss(); };
  page.on('dialog', noConsent);
  await panel.locator('[data-ai-send-note]').click();
  await expectFailure('cheie invalidă');
  await expect(guardrail).toContainText('Retry: nu');
  expect(unexpected).toEqual([]);
  page.off('dialog', noConsent);
  expect(await providerCalls(page)).toEqual([]);
  // The provider rejects the key. The settings field keeps the key in sessionStorage only; it is
  // set there directly so the filled note is not re-rendered by a trip to the settings pane.
  await page.evaluate(key => sessionStorage.setItem('ai_key_openai', key), KEY);
  await run(panel, page);
  await expectFailure('cheie invalidă');
  expect(await providerCalls(page)).toHaveLength(1);
  // The provider reports quota or rate limit; the user may retry.
  await providerMode(page, 'quota');
  await run(panel, page);
  await expectFailure('cotă/rate limit');
  await expect(guardrail).toContainText('Retry: da');
  expect(await providerCalls(page)).toHaveLength(1);
  // The provider never answers within the configured wait.
  await providerMode(page, 'timeout');
  await run(panel, page);
  await expect(status).toContainText('se trimite la furnizorul online BYOK');
  await expectFailure('timeout');
  await expect(guardrail).toContainText('Furnizorul nu a răspuns la timp.');
  expect(await providerCalls(page)).toHaveLength(1);
  // The raw provider messages are never shown or stored.
  await expect(panel).not.toContainText('Incorrect API key');
  await expect(panel).not.toContainText('Rate limit reached');
});
