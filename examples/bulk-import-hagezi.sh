#!/usr/bin/env bash
# Import hagezi Pro blocklist as denylist. Requires $NEXTDNS_API_KEY and PROFILE arg.
set -euo pipefail
PROFILE="${1:?usage: $0 <profile-id>}"

curl -fsSL https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt \
  | grep -v '^!' \
  | grep -v '^$' \
  | sed -E 's|^\|\|([^\^]+)\^$|\1|' \
  | ndns denylist bulk-add "$PROFILE" --stdin --concurrency=10
