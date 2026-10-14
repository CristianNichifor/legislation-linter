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
