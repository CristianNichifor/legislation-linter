import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

async function lint(page, days = 30) {
  await page.locator('#tab-lint').click();
  await page.locator('#draft').fill(`In termen de ${days} de zile, Guvernul aproba normele metodologice.`);
  await page.locator('#go').click();
  await expect(page.locator('#lint-out')).toContainText('verificat în');
  await expect(page.locator('#lint-out')).toContainText(String(days));
  await expect(page.locator('#lint-out')).not.toContainText('Eroare:');
}

for (const path of ['/', '/nested/']) {
test(`real worker, Pagefind and warm offline at ${path}`, async ({ page, context, browserName }, info) => {
  const requests = [];
  const errors = [];
  const pagefindResponses = [];
  const fallbackWarnings = [];
  context.on('request', request => requests.push(request.url()));
  context.on('response', response => {
    if (response.url().includes('/pagefind/')) pagefindResponses.push({ url: response.url(), ok: response.ok() });
  });
  page.on('console', message => {
    if (message.text().includes('revin la motor')) fallbackWarnings.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    globalThis.baselineWorkers = [];
    globalThis.Worker = new Proxy(globalThis.Worker, {
      construct(Target, args) {
        const worker = Reflect.construct(Target, args);
        const record = { url: new URL(args[0], location.href).href, ready: false };
        baselineWorkers.push(record);
        worker.addEventListener('message', event => {
          if (event.data?.type === 'ready') record.ready = true;
        });
        return worker;
      },
    });
  });
  await page.goto(path);
  await expect(page.locator('#stat')).toContainText('4 acte');
  expect(await page.evaluate(() => baselineWorkers.some(worker => worker.ready && worker.url.endsWith('/worker.js')))).toBe(true);
  expect(await page.evaluate(() => typeof globalThis.loadPyodide)).toBe('undefined');
  await lint(page);
  await page.locator('#tab-cauta').click();
  await page.locator('#q').fill('achizitii publice');
  await page.locator('#q').press('Enter');
  await expect(page.locator('#cauta-out')).toContainText('98');
  expect(pagefindResponses.some(response => response.ok && response.url.includes('.pf_index'))).toBe(true);
  expect(pagefindResponses.some(response => response.ok && response.url.includes('.pf_fragment'))).toBe(true);
  expect(pagefindResponses.filter(response => !response.ok)).toEqual([]);
  expect(requests.filter(url => url.includes('/pagefind/pagefind/'))).toEqual([]);
  expect(fallbackWarnings).toEqual([]);
  if (browserName === 'chromium') {
    expect(requests.some(url => url.includes('/pyodide/v0.27.2/'))).toBe(true);
  }
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const keys = await page.evaluate(async () => {
    const cachesFound = await caches.keys();
    const cache = await caches.open(cachesFound.find(name => name.startsWith('legislativ-shell-')));
    return (await cache.keys()).map(request => request.url);
  });
  expect(keys.some(url => url.endsWith('/worker.js'))).toBe(true);
  expect(keys.some(url => url.includes('/pagefind/'))).toBe(true);
  expect(keys.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(requests.filter(url => /\/api\//.test(url))).toEqual([]);
  const fixtureCorpusRequests = requests.filter(url => /\/corpus\.db/.test(url));
  // Chromium reports both the worker request and its service-worker forwarding.
  expect([...new Set(fixtureCorpusRequests)]).toEqual([new URL(`${path}data/corpus.db`, page.url()).href]);
  expect(fixtureCorpusRequests.length).toBeLessThanOrEqual(2);
  await page.screenshot({ path: info.outputPath('static-search-online.png'), fullPage: true });
  await context.setOffline(true);
  await lint(page, 47);
  const offlineSearch = await page.evaluate(async () => {
    const response = await fetch('/api/cauta?q=achizitii%20publice');
    return response.json();
  });
  expect(offlineSearch.results.map(result => result.act_id)).toContain('lege-98-2016');
  await page.locator('#tab-cauta').click();
  await page.locator('#q').press('Enter');
  await expect(page.locator('#cauta-out')).toContainText('98');
  expect(errors).toEqual([]);
  expect(requests.filter(url => /\/api\//.test(url))).toEqual([]);
  expect(requests.filter(url => /\/corpus\.db/.test(url))).toEqual(fixtureCorpusRequests);
  expect(fallbackWarnings).toEqual([]);
  await page.screenshot({ path: info.outputPath('static-search-warm-offline.png'), fullPage: true });
  // Firefox/WebKit reject Playwright offline navigation before exposing the cached shell.
  // Keep its real same-tab checks above; do not claim restart coverage for that engine.
  if (browserName !== 'chromium') return;
  // A reload loses the live worker. The service worker does not own the CDN runtime.
  await context.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.reload();
  await page.locator('#tab-lint').click();
  await expect(page.locator('#draft')).toBeVisible();
  const unavailable = await page.evaluate(async () => {
    const response = await fetch('/api/rezumat');
    return { status: response.status, body: await response.json() };
  });
  expect(unavailable.status).toBe(503);
  expect(unavailable.body.error).toContain('motor indisponibil');
  await page.locator('#draft').fill('In termen de 63 de zile, Guvernul aproba normele.');
  await page.locator('#go').click();
  await expect(page.locator('#lint-out')).toContainText('motor indisponibil');
  await page.screenshot({ path: info.outputPath('static-shell-without-cdn-runtime.png'), fullPage: true });
});
}

test('cold offline context cannot load an uncached static shell', async ({ page, context }) => {
  await context.setOffline(true);
  await expect(page.goto('/')).rejects.toThrow();
  expect(await context.serviceWorkers()).toEqual([]);
});

const CANONICAL = 'https://projects.cristian-nichifor.com/legislation-linter/';

test('metadata, canonical and skip link', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', CANONICAL);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', CANONICAL);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  for (const property of ['og:title', 'og:description']) {
    await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', /\S/);
  }
  await expect(page.locator('#main')).toHaveCount(1);
  // WebKit only moves Tab focus to links when the platform setting allows it.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skip = page.locator('a.skip-link[href="#main"]');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await skip.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('privacy page is linked and reachable', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('footer a[href="confidentialitate.html"]');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/confidentialitate\.html$/);
  await expect(page.locator('h1')).toContainText('Confidențialitate');
  await expect(page.locator('main')).toContainText('api.anthropic.com');
  await expect(page.locator('a[href="./"]')).toBeVisible();
});

const AXE = fileURLToPath(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url));

async function seriousViolations(page) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(() => globalThis.axe.run(document, {
    resultTypes: ['violations'],
  }));
  return result.violations
    .filter(violation => ['serious', 'critical'].includes(violation.impact))
    .map(violation => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 5).map(node => node.target.join(' ')),
    }));
}

test.describe('axe', () => {
// The privacy page's CSP forbids inline scripts; let the test inject axe anyway.
test.use({ bypassCSP: true });
test('axe: no serious or critical violations', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One engine is enough for the rule set.');
  await page.goto('/');
  await expect(page.locator('#stat')).toContainText('acte');
  expect(await seriousViolations(page)).toEqual([]);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await seriousViolations(page)).toEqual([]);
  await page.goto('/confidentialitate.html');
  expect(await seriousViolations(page)).toEqual([]);
});
});

// Pipeline words the UX bible keeps out of primary copy, and ASCII spellings that lost their
// diacritics. Detail, raw and debug areas may still use the machine terms.
const INTERNAL_TERMS = [
  /law-as-code/i, /\bgate\b/i, /\bruntime/i, /\bpayload/i, /\bhandoff/i, /\btracker\b/i,
  /\bpipeline/i, /\brebuild/i, /\breindex/i, /\bshard/i, /\bSQLite\b/, /\bworkbench\b/i,
  /\bpack\b/i, /AI\/BYOK\/MCP/, /\bgap\b/i, /Reîncarcă/,
  /law-matrix/, /\b[a-z]+_[a-z_]+\b/, /\bdraft\b/i,
  /\bCauta\b/, /\bFara\b/, /\bversiune noua\b/,
];

test('primary copy uses no internal terms', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#stat')).toContainText('acte');
  await expect(page.locator('#tab-matrice')).toHaveAttribute('aria-selected', 'true');
  // The matrix workspace renders after the engine answers; its copy is part of the default view.
  await expect(page.locator('[data-law-matrix-workspace-v1]')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(INTERNAL_TERMS.filter(term => term.test(text)).map(String)).toEqual([]);
  // One navigation, one flow: the panels that restated them are gone from the normal path.
  await expect(page.getByText('Principii de lucru')).toHaveCount(0);
  await expect(page.locator('.civic-workspace-status')).toHaveCount(0);
  // The daily flow restates the main flow strip: it stays one click away, collapsed.
  await expect(page.locator('#legislative-workflow')).not.toHaveAttribute('open', '');
  await expect(page.locator('#legislative-workflow .daily-flow-steps')).toBeHidden();
});

test('matrix is the default workspace and opens drafts in place', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tab-matrice')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pane-matrice')).toBeVisible();
  const groups = page.locator('[data-matrix-workspace-group]');
  await expect(groups.first()).toBeVisible();
  await expect(groups.first().locator('h4').first()).toContainText('intrări');
  // The matrix is what the first screen shows, not the sections below it.
  const viewport = page.viewportSize();
  for (const selector of ['#m-q', '[data-law-matrix-workspace-v1]']) {
    expect((await page.locator(selector).boundingBox()).y).toBeLessThan(viewport.height);
  }
  // Send the first cell to a dossier before one exists: the library opens in the matrix view.
  await groups.first().locator('[data-matrix-workspace-open-dossier]').first().click();
  await expect(page.locator('#tab-matrice')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pane-matrice')).toBeVisible();
  await expect(page.locator('#dossier-library')).toHaveAttribute('open', '');
  await expect(page.locator('#dossier-status')).toContainText('nota din matrice');
  // Creating the dossier resumes the pending note as a draft, still in the matrix view.
  await expect(page.locator('#dossier-local')).toBeVisible();
  const create = page.locator('#dossier-create');
  await create.locator('xpath=..').locator('summary').click();
  await create.locator('input[name="titlu"]').fill('Dosar din matrice');
  await create.locator('button[type="submit"]').click();
  const title = page.locator('#dossier-notes [data-manual-note-form] input[name="title"]');
  await expect(title).toBeVisible();
  await expect(title).toHaveValue(/^Notă matrice · /);
  await expect(title).toBeFocused();
  await expect(page.locator('#tab-matrice')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pane-matrice')).toBeVisible();
});

test('one navigation, breadcrumb and hash routing', async ({ page }) => {
  await page.goto('/');
  const tabs = page.getByRole('tablist').getByRole('tab');
  await expect(tabs).toHaveText(['Start', 'Verifică', 'Caută', 'Matrice', 'Dosare', 'Surse', 'Redactare', 'Setări']);
  await expect(page.locator('.workflow-nav, [data-main-nav], [data-flow-target]')).toHaveCount(0);
  await expect(page.getByText(/Flux (principal|zilnic)/)).toHaveCount(0);
  const crumb = page.locator('nav.breadcrumb');
  await expect(crumb).toBeVisible();
  expect((await crumb.boundingBox()).height).toBeLessThan(72);
  // Secondary tools sit one click away.
  await page.getByRole('button', { name: 'Mai multe' }).click();
  await page.getByRole('menuitem', { name: 'Drept UE' }).click();
  await expect(page.locator('#pane-ue')).toBeVisible();
  await expect(page).toHaveURL(/#ue$/);
  await expect(page.getByRole('menuitem', { name: 'Drept UE' })).toBeHidden();
  await page.getByRole('tab', { name: 'Verifică' }).click();
  await expect(page).toHaveURL(/#verifica$/);
  await expect(page.locator('#pane-lint')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#pane-ue')).toBeVisible();
  await page.getByRole('tab', { name: 'Dosare' }).click();
  await expect(page).toHaveURL(/#dosare$/);
  await expect(page.locator('#pane-matrice')).toBeVisible();
  await expect(page.locator('#dossier-library')).toHaveAttribute('open', '');
  await page.getByRole('tab', { name: 'Setări' }).click();
  await expect(page.locator('#pane-setari')).toBeVisible();
  await expect(page.locator('#pane-setari #tema-btn')).toBeVisible();
  await expect(page.locator('#pane-setari a[href="confidentialitate.html"]')).toBeVisible();
  await page.goto('/#cauta');
  await expect(page.locator('#pane-cauta')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Caută' })).toHaveAttribute('aria-selected', 'true');
});

test('engine timeout, progress and cancel', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Worker requests are routed reliably in Chromium only.');
  test.setTimeout(150_000);
  // The engine's runtime never answers, so the worker waits on it forever.
  await context.route('https://cdn.jsdelivr.net/**', () => {});
  await page.goto('/#verifica');
  await page.locator('#draft').fill('In termen de 30 de zile, Guvernul aproba normele metodologice.');
  await page.locator('#go').click();
  await expect(page.locator('#lint-out')).toContainText('Pornesc motorul');
  await page.locator('#lint-out [data-lint-cancel]').click();
  await expect(page.locator('#lint-out')).toContainText('Verificare anulată');
  await expect(page.locator('#go')).toBeEnabled();
  await page.locator('#go').click();
  await expect(page.locator('#lint-out')).toContainText('Motorul nu a pornit — reîncearcă', { timeout: 40_000 });
  await expect(page.locator('#lint-out').getByRole('button', { name: 'Reîncearcă' })).toBeVisible();
  await expect(page.locator('#stat')).not.toContainText('se încarcă');
  await expect(page.locator('#stat')).toContainText('Motorul nu a pornit');
});

test.describe('form', () => {
test.use({ viewport: { width: 1440, height: 900 } });
test('form labels, target size and check-first layout', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'One engine is enough for the rule set.');
  test.setTimeout(240_000);
  await page.goto('/');
  await expect(page.locator('#stat')).toContainText('acte');
  await page.addScriptTag({ path: AXE });
  const hashes = ['matrice', 'start', 'verifica', 'cauta', 'dosare', 'surse', 'redactare', 'setari',
    'consolidat', 'conexiuni', 'parlamentari', 'domenii', 'ue', 'supraveghere'];
  const problems = [];
  for (const hash of hashes) {
    await page.evaluate(value => { location.hash = value; }, hash);
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => globalThis.axe.run(document, {
      runOnly: ['label', 'select-name', 'button-name', 'link-name', 'target-size'],
      resultTypes: ['violations'],
    }));
    for (const violation of result.violations) {
      problems.push(`${hash}: ${violation.id} ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`);
    }
    // A text field without the app's field style renders as a raw browser widget.
    const raw = await page.evaluate(() => [...document.querySelectorAll(
      'input:not([type]),input[type=text],input[type=search],input[type=url],input[type=number],input[type=date],textarea')]
      .filter(field => field.offsetParent !== null && parseFloat(getComputedStyle(field).paddingLeft) < 4)
      .map(field => field.name || field.id || field.className));
    if (raw.length) problems.push(`${hash}: unstyled ${raw.join(', ')}`);
  }
  expect(problems).toEqual([]);
  await page.evaluate(() => { location.hash = 'verifica'; });
  for (const selector of ['#draft', '#go']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.y + box.height).toBeLessThan(900);
  }
});
});

test('dataset date and stale warning', async ({ page }) => {
  await page.goto('/');
  const stat = page.locator('#stat');
  await expect(stat).toContainText('4 acte');
  // The committed fixtures were captured on this date, more than 30 days ago.
  await expect(stat).toContainText('date la zi pe 2026-09-05');
  await expect(page.locator('#stat [data-dataset-stale]')).toBeVisible();
  await expect(page.locator('#stat [data-dataset-stale]')).toContainText('peste 30 de zile');
});
