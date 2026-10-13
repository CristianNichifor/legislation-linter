// node:test cases for functions/_middleware.js (the Pages preview gate), run by
// tests/test_pages_middleware.py.
import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.crypto ??= webcrypto;
const { onRequest } = await import(new URL("../functions/_middleware.js", import.meta.url));

const SECRET = "g".repeat(64);
const served = new Response("static");
const run = (url, { env = {}, header } = {}) => {
  const headers = new Headers();
  if (header !== undefined) headers.set("x-cnw-preview-gate", header);
  let nexted = false;
  const next = async () => { nexted = true; return served; };
  return onRequest({ request: new Request(url, { headers }), env, next }).then((response) => ({ response, nexted }));
};

test("a preview host without the secret configured is refused", async () => {
  for (const url of ["https://dev.legislation-linter-x1y.pages.dev/legislation-linter/", "https://8bd308ff.legislation-linter-x1y.pages.dev/"]) {
    const { response, nexted } = await run(url, { header: "anything" });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(nexted, false);
  }
});

test("with the secret configured, a missing or wrong header is refused", async () => {
  for (const header of [undefined, "wrong", "g".repeat(63)]) {
    const { response, nexted } = await run("https://dev.legislation-linter-x1y.pages.dev/", { env: { PREVIEW_GATE_SECRET: SECRET }, header });
    assert.equal(response.status, 403);
    assert.equal(nexted, false);
  }
});

test("the gate's header is served", async () => {
  const { response, nexted } = await run("https://dev.legislation-linter-x1y.pages.dev/", { env: { PREVIEW_GATE_SECRET: SECRET }, header: SECRET });
  assert.equal(response, served);
  assert.equal(nexted, true);
});

test("the production pages.dev host is served without the secret", async () => {
  const { response, nexted } = await run("https://legislation-linter-x1y.pages.dev/legislation-linter/");
  assert.equal(response, served);
  assert.equal(nexted, true);
});
