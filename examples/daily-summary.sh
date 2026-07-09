#!/usr/bin/env bash
# Daily summary for a profile. Requires jq.
set -euo pipefail
PROFILE="${1:?usage: $0 <profile-id>}"

echo "== last 24h =="
ndns analytics status "$PROFILE" --from=-24h --output=json | jq '.data'

echo ""
echo "== top blocked domains =="
ndns analytics domains "$PROFILE" --from=-24h --status=blocked --limit=10 --output=json \
  | jq -r '.data[] | "\(.queries)\t\(.domain)"'
