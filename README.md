# ndns

[![Stars](https://img.shields.io/github/stars/chirag127/ndns?style=flat&logo=github&label=Star)](https://github.com/chirag127/ndns/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deno](https://img.shields.io/badge/deno-2.9+-black.svg)](https://deno.com)
[![Bun](https://img.shields.io/badge/bun-1.3+-orange.svg)](https://bun.sh)

Complete NextDNS account CLI. Full official-API coverage. Deno + Bun single-file TS.

Docs + command reference: <https://ndns.oriz.in>

Fills gap left by `nextdns/nextdns` (forwarder-only) and 3rd-party libs (all narrow or stale).

## Beta notice

NextDNS API is BETA. Subject to breaking changes. See [official docs](https://nextdns.github.io/api). Report breakage via GH issues.

## Install

```bash
# Deno (recommended)
deno install -grf --allow-net --allow-env --allow-read --allow-write \
  -n ndns https://raw.githubusercontent.com/chirag127/ndns/main/src/mod.ts

# Bun
bun install -g @chirag127/ndns

# Binary — download from GH releases
# https://github.com/chirag127/ndns/releases
```

## Auth

Set `NEXTDNS_API_KEY`. Get key at [my.nextdns.io/account](https://my.nextdns.io/account).

```bash
# bash/zsh
export NEXTDNS_API_KEY='<your-key>'

# PowerShell
$env:NEXTDNS_API_KEY = '<your-key>'
```

Store in password manager, not shell history.

## Quick start

```bash
ndns whoami                                        # verify key
ndns profile list                                  # list profiles
ndns denylist add <profile> ads.example.com        # add domain
ndns analytics status <profile> --from=-24h        # last-24h stats
ndns logs stream <profile>                         # live tail
```

## Commands

| Command                                                                                | Purpose                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `whoami`                                                                               | Verify API key + list profiles           |
| `profile <list\|show\|create\|update\|delete>`                                         | Profile CRUD                             |
| `denylist <list\|add\|remove\|toggle-active\|bulk-add\|bulk-remove\|export\|import>`   | Block domains                            |
| `allowlist <...>`                                                                      | Same shape as denylist                   |
| `blocklist <list-available\|list\|subscribe\|unsubscribe>`                             | Curated blocklists                       |
| `native <list\|add\|remove>`                                                           | Native tracker feeds (Apple/Google/etc.) |
| `security <show\|set\|tld>`                                                            | Threat protection settings               |
| `parental <show\|safe-search\|youtube-restricted\|block-bypass\|services\|categories>` | Parental control                         |
| `privacy <show\|set>`                                                                  | Privacy toggles                          |
| `settings <show\|logs\|blockpage\|performance>`                                        | Profile settings                         |
| `analytics <resource> <profile>`                                                       | 11 endpoints, time-series via `--series` |
| `logs <list\|stream\|download\|clear>`                                                 | Query logs, SSE stream                   |
| `config <export\|import>`                                                              | Full profile backup / restore            |

## Flags

| Flag                          | Meaning                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `--output=<table\|json\|csv>` | Output format (default: table for lists, json for objects)         |
| `--from=<date>`               | ISO 8601, unix seconds, unix ms, or relative (`-6h`, `-1d`, `-7d`) |
| `--to=<date>`                 | Same as `--from`                                                   |
| `--limit=<n>`                 | 1-500 for analytics, 10-1000 for logs                              |
| `--device=<id>`               | Filter by device ID (or `__UNIDENTIFIED__`)                        |
| `--search=<text>`             | Log/analytics search                                               |
| `--series`                    | Analytics time-series mode                                         |
| `--interval=<1d\|1h\|30m>`    | Series bucket size                                                 |
| `--timezone=<IANA>`           | e.g. `America/New_York`                                            |

## Examples

See [examples/](./examples/):

- `bulk-import-hagezi.sh` — import hagezi blocklist as denylist
- `daily-summary.sh` — daily analytics summary via jq
- `sync-two-profiles.sh` — copy config A → B

## Contributing

Issues + PRs welcome. Terse issues preferred: what happened, what expected, env.

## License

MIT © chirag127
