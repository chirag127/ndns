// Date arg handling. Accept ISO 8601, unix seconds, unix ms, or relative (-6h, -1d).
// NextDNS API accepts these directly, so we mostly pass-through with light validation.

export function normalizeDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s) return undefined;
  // relative form: -6h, -1d, -30m, -7d
  if (/^-\d+[smhdw]$/i.test(s)) return s;
  // unix seconds or ms (all digits)
  if (/^\d+$/.test(s)) return s;
  // ISO 8601 or anything else — pass through
  return s;
}

export function intervalToSeconds(v: string): number {
  // "1d" -> 86400, "1h" -> 3600, "30m" -> 1800
  const m = /^(\d+)([smhdw])$/i.exec(v);
  if (!m) return parseInt(v, 10) || 0;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  return n * ({ s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[unit] ?? 1);
}
