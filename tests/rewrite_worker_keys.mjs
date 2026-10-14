// Drives infra/worker/src/index.js with an in-memory KV: production and the dev preview
// (CHEIE_PREFIX "dev/") rewrite the same provision; prints the KV keys and the cache flags.
const worker = (await import(new URL('../infra/worker/src/index.js', import.meta.url))).default;
const store = new Map();
const kv = { get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
const ai = { run: async () => ({ response: 'rescriere de test' }) };
const cached = [];
for (const prefix of [undefined, 'dev/', undefined]) {
  const env = { RESCRIERI: kv, AI: ai, CAP_ZILNIC: '100', ORIGINI: '*', ...(prefix ? { CHEIE_PREFIX: prefix } : {}) };
  const request = new Request('https://x.test/api/rewrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://x.test' },
    body: JSON.stringify({ act: 'L1-2020', loc: 'art1', stil: 'nou', text: 'Textul articolului de lege care trebuie rescris pe intelesul tuturor.' }),
  });
  cached.push((await (await worker.fetch(request, env, { waitUntil() {} })).json()).cached);
}
console.log(JSON.stringify({ keys: [...store.keys()].sort(), cached }));
