// The GitHub Pages redirect stub (redirect/): every old link lands on the same place on the hub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const target = 'https://projects.cristian-nichifor.com/legislation-linter/';
const pages = ['index.html', '404.html'].map((name) => [
  name,
  readFileSync(new URL(`../redirect/${name}`, import.meta.url), 'utf8'),
]);

const cases = [
  ['/legislation-linter/', '', '', target],
  ['/legislation-linter', '', '', target],
  ['/legislation-linter/index.html', '', '', target + 'index.html'],
  ['/legislation-linter/a/b', '?x=1', '#h', target + 'a/b?x=1#h'],
  ['/legislation-linter/', '?q=lege%2F1&y=2', '#act=%7B%22id%22%3A1%7D', target + '?q=lege%2F1&y=2#act=%7B%22id%22%3A1%7D'],
  ['/somewhere-else', '?x=1', '', target + '?x=1'],
];

for (const [name, html] of pages) {
  test(`${name}: the script carries path, query and hash`, () => {
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi)];
    assert.equal(scripts.length, 1, 'expected one redirect script');
    for (const [pathname, search, hash, expected] of cases) {
      const went = [];
      const location = { pathname, search, hash, replace: (url) => went.push(url) };
      vm.runInNewContext(scripts[0][1], { location }, { timeout: 1000 });
      assert.deepEqual(went, [expected], `${pathname}${search}${hash}`);
    }
  });

  test(`${name}: canonical, noindex, refresh and visible link agree`, () => {
    assert.ok(html.includes(`<link rel="canonical" href="${target}" />`));
    assert.ok(html.includes('<meta name="robots" content="noindex" />'));
    const fallback = html.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript\b[^>]*>/i);
    assert.ok(fallback, 'no-JavaScript fallback is required');
    assert.ok(fallback[1].includes(`http-equiv="refresh" content="0; url=${target}"`));
    assert.ok(html.includes(`<a href="${target}">`));
  });
}
