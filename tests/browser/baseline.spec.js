import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`local corpus search, lint and theme persistence at ${width}px`, async ({ page, context }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    const external = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') {
        external.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('#q')).toHaveClass(/civic-input/);
    await expect(page.locator('#f-tip')).toHaveClass(/civic-select/);
    await expect(page.locator('#f-an-min')).toHaveClass(/civic-select/);
    await expect(page.locator('#f-an-max')).toHaveClass(/civic-select/);
    expect(requests.some(url => url.endsWith('/vendor/civic-ui/styles.css'))).toBe(true);
    await page.locator('#tab-matrice').click();
    await page.locator('#lifecycle-tracker').evaluate(panel => { panel.open = true; });
    await page.locator('#lifecycle-filter').selectOption('toate');
    await page.locator('#lifecycle-search input[name="q"]').fill('plx-999999-2026');
    await page.locator('#lifecycle-search').evaluate(form => form.requestSubmit());
    await expect(page.locator('#lifecycle-list')).toContainText('plx-999999-2026');
    await expect(page.locator('#lifecycle-list')).toContainText('Contract traseu urmărit');
    await expect(page.locator('#lifecycle-list')).toContainText('Monitorul Oficial');
    await page.evaluate(() => {
      window.__workbenchClipboard = '';
      window.__workbenchDownloadFilename = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async text => { window.__workbenchClipboard = text; } },
      });
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download) window.__workbenchDownloadFilename = this.download;
        return click.call(this);
      };
    });
    const workbenchResponse = page.waitForResponse(response =>
      response.url().includes('/api/project-evidence-pack') && response.url().includes('project_id=plx-999999-2026')
    );
    await page.locator('[data-lifecycle-workbench]').first().click();
    expect((await workbenchResponse).ok()).toBe(true);
    await expect(page.locator('#project-workbench-status')).toContainText('Pachet încărcat');
    await expect(page.locator('#project-workbench-body')).toContainText('Spațiu de lucru · plx-999999-2026');
    await expect(page.locator('#project-workbench-body')).toContainText('Raport depus');
    await page.locator('#project-workbench-body [data-workbench-copy]').evaluate(button => button.click());
    await expect.poll(() => page.evaluate(() => window.__workbenchClipboard)).toContain('# Pachet dovezi proiect: plx-999999-2026');
    await page.locator('[data-workbench-download]').click();
    await expect.poll(() => page.evaluate(() => window.__workbenchDownloadFilename)).toBe('pachet-dovezi-plx-999999-2026.md');
    const draftResponse = page.waitForResponse(response =>
      response.url().includes('/api/project-draft-seed') && response.url().includes('project_id=plx-999999-2026')
    , { timeout: 15_000 }).catch(() => null);
    await page.locator('[data-lifecycle-draft]').first().click();
    const draftHttp = await draftResponse;
    if (draftHttp) expect(draftHttp.ok()).toBe(true);
    if (await page.locator('#pane-lint').isHidden()) {
      await page.locator('#tab-lint').click();
    }
    await expect(page.locator('#pane-lint')).toBeVisible();
    await expect(page.locator('#draft')).toHaveValue(/Proiect urmărit: plx-999999-2026/);
    const trackerResponse = page.waitForResponse(response =>
      response.url().includes('/api/tracker-evenimente') && response.url().includes('project_id=plx-999999-2026')
    );
    await page.locator('#tab-matrice').click();
    await page.locator('[data-lifecycle-timeline]').first().click();
    expect((await trackerResponse).ok()).toBe(true);
    await expect(page.locator('#tracker-timeline-status')).toContainText('6 din 6 evenimente');
    await expect(page.locator('#tracker-timeline-list')).toContainText('Raport depus');
    await expect(page.locator('#tracker-timeline-list')).toContainText('Comisie sesizată pentru fond');
    await expect(page.locator('#tracker-timeline-list')).toContainText('Comisia juridică');
    await expect(page.locator('#tracker-timeline-list')).toContainText('Publicat în Monitorul Oficial');
    await page.locator('#tracker-dossier-id').fill('11111111111111111111111111111111');
    await page.locator('#tracker-project-id').fill('');
    await page.locator('#tracker-timeline-search').evaluate(form => form.requestSubmit());
    await expect(page.locator('#tracker-timeline-status')).toContainText('1 din 1 evenimente');
    await expect(page.locator('#tracker-timeline-list')).toContainText('dosar 11111111111111111111111111111111');
    await page.locator('#dossier-library > summary').click();
    await expect(page.locator('#dossier-local')).toBeVisible();
    await page.locator('#dossier-create').evaluate(form => form.closest('details').open = true);
    await page.locator('#dossier-create input[name="titlu"]').fill(`Fișă act ${width}`);
    await page.locator('#dossier-create textarea[name="intrebare"]').fill('Ce afectează legea?');
    await page.locator('#dossier-create input[name="domeniu"]').fill('test');
    await page.locator('#dossier-create button[type="submit"]').click();
    await expect(page.locator('#dossier-status')).toContainText('Dosar ales');
    await page.locator('#tab-cauta').click();
    await expect(page.locator('#pane-cauta')).toBeVisible();
    await page.locator('#q').fill('registrul demonstrativ');
    await page.locator('#q').press('Enter');
    await expect(page.locator('#cauta-out')).toContainText('999999');
    const projectButton = page.locator('#cauta-out .impact-proiecte').first();
    await expect(projectButton).toBeVisible();
    await projectButton.click();
    await expect(page.locator('#cauta-out .project-impact').first()).toContainText('plx-999999-2026');
    await expect(page.locator('#cauta-out .project-impact').first()).toContainText('raport depus');
    await expect(page.locator('#cauta-out .project-impact').first()).toContainText('Ținte în act');
    await page.locator('#cauta-out .impact-compare').first().click();
    await expect(page.locator('#cauta-out .matrix-draft-form').first()).toContainText('Compară două proiecte');
    await page.locator('#cauta-out .law-workbench-btn').first().click();
    await expect(page.locator('#cauta-out .law-workbench').first()).toContainText('Fișă de lucru');
    await expect(page.locator('#cauta-out .law-workbench').first()).toContainText('Următorii pași');
    await expect(page.locator('#cauta-out .law-workbench').first()).toContainText('Inițiative pendinte');
    await page.locator('#cauta-out .law-workbench .dossier-actions button').first().click();
    await expect(page.locator('#dossier-saved')).toContainText('fisa-act-v1');
    await expect(page.locator('#dossier-saved')).toContainText('Fișă de lucru');
    await page.locator('#cauta-out .impact-watch').first().click();
    await expect(page.locator('#cauta-out .impact-watch').first()).toContainText('supravegheat');
    await page.screenshot({ path: info.outputPath(`search-${width}.png`), fullPage: true });
    await page.locator('#tab-lint').click();
    await page.locator('#draft').fill('In termen de 30 de zile, Guvernul aproba normele metodologice.');
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/lint'));
    await page.locator('#go').click();
    expect((await responsePromise).ok()).toBe(true);
    await expect(page.locator('#lint-out')).toContainText('verificat în');
    await expect(page.locator('#lint-out')).not.toContainText('Eroare:');
    await page.screenshot({ path: info.outputPath(`lint-${width}.png`), fullPage: true });
    await page.locator('#tab-setari').click();
    await page.locator('#tema-btn').click();
    const theme = await page.evaluate(() => localStorage.getItem('tema'));
    expect(['light', 'dark']).toContain(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('tema'))).toBe(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const relevantErrors = errors.filter(message =>
      !(
        info.project.name === 'webkit' &&
        (message.includes('/api/termeni due to access control checks.') ||
          message.includes('/api/sugereaza?text=') && message.includes('due to access control checks.'))
      )
    );
    expect(external).toEqual([]);
    expect(relevantErrors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`local-${width}.png`), fullPage: true });
  });
}

test('reduced motion and forced colours keep state visible', async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#tab-matrice')).toBeVisible();
  const motion = await page.evaluate(() => {
    const spin = document.createElement('span');
    spin.className = 'spin';
    document.body.append(spin);
    const result = {
      animation: getComputedStyle(spin).animationName,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    };
    spin.remove();
    return result;
  });
  expect(motion.animation).toBe('none');
  expect(motion.scroll).toBe('auto');

  const declaresForcedColours = await page.evaluate(() =>
    [...document.styleSheets].some(sheet => {
      try {
        return [...sheet.cssRules].some(rule => rule.conditionText?.includes('forced-colors'));
      } catch { return false; }
    })
  );
  expect(declaresForcedColours).toBe(true);

  if (browserName === 'webkit') return; // WebKit does not implement forced-colors emulation.
  await page.emulateMedia({ forcedColors: 'active' });
  const active = page.locator('.tab[aria-selected="true"]');
  await expect(active).toBeVisible();
  const border = await active.evaluate(el => {
    const style = getComputedStyle(el);
    return { width: style.borderBottomWidth, color: style.borderBottomColor };
  });
  expect(border.width).toBe('3px');
  expect(border.color).not.toBe('rgba(0, 0, 0, 0)');
});

test('phone tab list is one scrollable row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#tab-matrice')).toBeVisible();
  const layout = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.tablist .tab')];
    const list = document.querySelector('.tablist');
    const tops = new Set(tabs.map(tab => Math.round(tab.getBoundingClientRect().top)));
    const more = document.getElementById('more-toggle').getBoundingClientRect();
    return {
      rows: tops.size,
      scrolls: list.scrollWidth > list.clientWidth,
      pageScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      moreInView: more.right <= window.innerWidth && more.width > 0,
      minHeight: Math.min(...tabs.map(tab => tab.getBoundingClientRect().height)),
    };
  });
  expect(layout.rows).toBe(1);
  expect(layout.scrolls).toBe(true);
  expect(layout.pageScroll).toBeLessThanOrEqual(0);
  expect(layout.moreInView).toBe(true);
  expect(layout.minHeight).toBeGreaterThanOrEqual(44);
  await page.locator('#tab-setari').scrollIntoViewIfNeeded();
  await page.locator('#tab-setari').click();
  await expect(page.locator('#tab-setari')).toHaveAttribute('aria-selected', 'true');
});
