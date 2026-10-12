#!/usr/bin/env bash
# Deploy the plain-language rewrite service to Cloudflare (free tier).
#
# It runs on Workers AI — no provider key needed. The optional AI Gateway (step 1) gives free caching
# + analytics; the Worker falls back to Workers AI directly without it. Run from anywhere in the repo.
#
#   CLOUDFLARE_API_TOKEN=<token with AI Gateway Edit>  ./infra/deploy.sh   # creates the gateway too
#   ./infra/deploy.sh                                                      # deploy only (wrangler login)
set -euo pipefail

ACCOUNT="5d5a0c8a05e5d8292065cd0c0cf60291"   # CN Webify Customers
GATEWAY="law-legislation-project-gateway"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/worker" && pwd)"
cd "$here"

echo "==> 1/3  AI Gateway '$GATEWAY' (free caching + analytics + rate limit)"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  code=$(curl -sS -o /tmp/gw.json -w '%{http_code}' -X POST \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/ai-gateway/gateways" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
    -d '{"id":"'"$GATEWAY"'","cache_ttl":86400,"cache_invalidate_on_update":false,"collect_logs":true,"rate_limiting_interval":60,"rate_limiting_limit":100,"rate_limiting_technique":"fixed"}') || true
  if [ "$code" = "200" ]; then echo "    created."
  elif grep -q "already exists\|duplicate" /tmp/gw.json 2>/dev/null; then echo "    already exists — ok."
  else echo "    skipped (HTTP $code): $(cat /tmp/gw.json 2>/dev/null)"; echo "    the Worker falls back to Workers AI directly, so deploy continues."; fi
else
  echo "    CLOUDFLARE_API_TOKEN not set — skipping (create it in the dashboard, or set the token)."
  echo "    The Worker falls back to Workers AI directly, so this is optional."
fi

echo "==> 2/2  wrangler deploy"
# Pinned so a login with access to several accounts cannot deploy to the wrong one.
CLOUDFLARE_ACCOUNT_ID="$ACCOUNT" npx wrangler deploy

echo
echo "Done — runs on Workers AI, no key needed."
echo "Endpoint: https://projects.cristian-nichifor.com/legislation-linter/api/rewrite"
echo "Paste it in the app under 'online (BYOK)' → 'Worker propriu'."
