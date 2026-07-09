#!/usr/bin/env bash
# Sync full config from profile A -> profile B (merge mode).
set -euo pipefail
SRC="${1:?usage: $0 <src-profile> <dst-profile>}"
DST="${2:?usage: $0 <src-profile> <dst-profile>}"

TMP="$(mktemp -t ndns-XXXXXX.json)"
trap 'rm -f "$TMP"' EXIT

ndns config export "$SRC" --out "$TMP"
ndns config import "$DST" --from-file "$TMP" --mode=merge
echo "synced $SRC -> $DST"
