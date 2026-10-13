// Cloudflare Pages Functions middleware: the dev preview of this app is served only to the
// CN Webify preview gate (ADR-022), which signs people in first and proves it with a header.
// PREVIEW_GATE_SECRET is set on the Pages preview environment only, so production never
// checks it. A preview host (`<branch or hash>.<project>.pages.dev`) without the secret also
// answers 403: previews fail closed until the gate's deploy script has set it.
// Same rule as the projects hub (digital-public-administration-lab functions/_middleware.ts).

export const PREVIEW_GATE_HEADER = "x-cnw-preview-gate";

export const isPreviewHost = (hostname) => hostname.endsWith(".pages.dev") && hostname.split(".").length > 3;

async function sameSecret(given, expected) {
  if (given === null) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([given, expected].map((value) => crypto.subtle.digest("SHA-256", encoder.encode(value))));
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function onRequest(context) {
  const gate = context.env?.PREVIEW_GATE_SECRET;
  const hostname = new URL(context.request.url).hostname;

  if ((gate || isPreviewHost(hostname)) && !(gate && (await sameSecret(context.request.headers.get(PREVIEW_GATE_HEADER), gate)))) {
    return new Response("Not found", { status: 403, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
  }
  return context.next();
}
