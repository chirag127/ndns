// NextDNS API client. X-Api-Key header, retry on 429, cursor pagination.
// Works on Deno + Bun via native fetch.

export const BASE_URL = "https://api.nextdns.io";

export interface ApiError {
  code: string;
  detail?: string;
  source?: { pointer?: string; parameter?: string };
}

export class NextDnsApiError extends Error {
  status: number;
  errors: ApiError[];
  constructor(status: number, errors: ApiError[]) {
    const codes = errors.map((e) => e.code).join(", ");
    super(`API error ${status}: ${codes}`);
    this.status = status;
    this.errors = errors;
  }
}

export interface Pagination {
  cursor?: string;
}

export interface Envelope<T> {
  data: T;
  meta?: { pagination?: Pagination };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface RequestOpts {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export class NextDnsClient {
  constructor(private apiKey: string, private baseUrl: string = BASE_URL) {}

  private buildUrl(path: string, query?: RequestOpts["query"]): URL {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url;
  }

  /** Raw request — returns full envelope. */
  async requestRaw<T>(
    method: string,
    path: string,
    opts: RequestOpts = {},
  ): Promise<Envelope<T>> {
    const url = this.buildUrl(path, opts.query);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          method,
          headers: {
            "X-Api-Key": this.apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ndns-cli",
          },
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });
      } catch (e) {
        lastErr = e;
        if (attempt === 3) throw e;
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      // Rate limited
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("Retry-After") ?? "1", 10);
        await sleep(Math.max(1, ra) * 1000);
        continue;
      }

      // Server error — backoff and retry
      if (res.status >= 500 && attempt < 3) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      // 204 No Content
      if (res.status === 204) return { data: undefined as unknown as T };

      const text = await res.text();
      const json = text ? safeJson(text) : {};

      if (!res.ok) {
        const errors = (json && json.errors) || [
          { code: `http_${res.status}`, detail: text.slice(0, 200) },
        ];
        throw new NextDnsApiError(res.status, errors);
      }
      return json as Envelope<T>;
    }
    throw lastErr instanceof Error ? lastErr : new Error("max retries exceeded");
  }

  /** Unwrap .data from envelope. */
  async request<T>(
    method: string,
    path: string,
    opts: RequestOpts = {},
  ): Promise<T> {
    const env = await this.requestRaw<T>(method, path, opts);
    return env.data;
  }

  /** Auto-follow cursor pagination for array endpoints. */
  async *paginate<T>(
    path: string,
    query: RequestOpts["query"] = {},
  ): AsyncGenerator<T> {
    let cursor: string | undefined;
    do {
      const env = await this.requestRaw<T[]>("GET", path, {
        query: { ...query, ...(cursor ? { cursor } : {}) },
      });
      const items = Array.isArray(env.data) ? env.data : [];
      for (const it of items) yield it;
      cursor = env.meta?.pagination?.cursor;
    } while (cursor);
  }

  /** Collect all pages into an array. */
  async paginateAll<T>(
    path: string,
    query: RequestOpts["query"] = {},
  ): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this.paginate<T>(path, query)) out.push(item);
    return out;
  }

  // ---------- Profile CRUD ----------
  listProfiles() {
    return this.paginateAll<{ id: string; fingerprint?: string; name?: string }>("/profiles");
  }
  getProfile(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}`);
  }
  createProfile(body: Record<string, unknown>) {
    return this.request<{ id: string }>("POST", "/profiles", { body });
  }
  updateProfile(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}`, { body });
  }
  deleteProfile(id: string) {
    return this.request("DELETE", `/profiles/${id}`);
  }

  // ---------- Sub-resources (obj-shaped) ----------
  getSecurity(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/security`);
  }
  patchSecurity(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/security`, { body });
  }

  getPrivacy(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/privacy`);
  }
  patchPrivacy(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/privacy`, { body });
  }

  getParentalControl(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/parentalControl`);
  }
  patchParentalControl(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/parentalControl`, { body });
  }

  getSettings(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/settings`);
  }
  patchSettings(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/settings`, { body });
  }

  getSettingsLogs(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/settings/logs`);
  }
  patchSettingsLogs(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/settings/logs`, { body });
  }

  getSettingsBlockPage(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/settings/blockPage`);
  }
  patchSettingsBlockPage(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/settings/blockPage`, { body });
  }

  getSettingsPerformance(id: string) {
    return this.request<Record<string, unknown>>("GET", `/profiles/${id}/settings/performance`);
  }
  patchSettingsPerformance(id: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/profiles/${id}/settings/performance`, { body });
  }

  // ---------- Sub-resources (array-shaped) ----------
  listDenylist(id: string) {
    return this.paginateAll<{ id: string; active: boolean }>(`/profiles/${id}/denylist`);
  }
  addDenylist(id: string, domain: string, active = true) {
    return this.request("POST", `/profiles/${id}/denylist`, { body: { id: domain, active } });
  }
  patchDenylist(id: string, domain: string, active: boolean) {
    return this.request("PATCH", `/profiles/${id}/denylist/${encodeURIComponent(domain)}`, {
      body: { active },
    });
  }
  removeDenylist(id: string, domain: string) {
    return this.request("DELETE", `/profiles/${id}/denylist/${encodeURIComponent(domain)}`);
  }

  listAllowlist(id: string) {
    return this.paginateAll<{ id: string; active: boolean }>(`/profiles/${id}/allowlist`);
  }
  addAllowlist(id: string, domain: string, active = true) {
    return this.request("POST", `/profiles/${id}/allowlist`, { body: { id: domain, active } });
  }
  patchAllowlist(id: string, domain: string, active: boolean) {
    return this.request("PATCH", `/profiles/${id}/allowlist/${encodeURIComponent(domain)}`, {
      body: { active },
    });
  }
  removeAllowlist(id: string, domain: string) {
    return this.request("DELETE", `/profiles/${id}/allowlist/${encodeURIComponent(domain)}`);
  }

  listBlocklists(id: string) {
    return this.paginateAll<{ id: string }>(`/profiles/${id}/privacy/blocklists`);
  }
  addBlocklist(id: string, blocklistId: string) {
    return this.request("POST", `/profiles/${id}/privacy/blocklists`, {
      body: { id: blocklistId },
    });
  }
  removeBlocklist(id: string, blocklistId: string) {
    return this.request(
      "DELETE",
      `/profiles/${id}/privacy/blocklists/${encodeURIComponent(blocklistId)}`,
    );
  }

  listNatives(id: string) {
    return this.paginateAll<{ id: string }>(`/profiles/${id}/privacy/natives`);
  }
  addNative(id: string, nativeId: string) {
    return this.request("POST", `/profiles/${id}/privacy/natives`, { body: { id: nativeId } });
  }
  removeNative(id: string, nativeId: string) {
    return this.request(
      "DELETE",
      `/profiles/${id}/privacy/natives/${encodeURIComponent(nativeId)}`,
    );
  }

  listSecurityTlds(id: string) {
    return this.paginateAll<{ id: string }>(`/profiles/${id}/security/tlds`);
  }
  addSecurityTld(id: string, tld: string) {
    return this.request("POST", `/profiles/${id}/security/tlds`, { body: { id: tld } });
  }
  removeSecurityTld(id: string, tld: string) {
    return this.request("DELETE", `/profiles/${id}/security/tlds/${encodeURIComponent(tld)}`);
  }

  listParentalServices(id: string) {
    return this.paginateAll<{ id: string; active: boolean }>(
      `/profiles/${id}/parentalControl/services`,
    );
  }
  addParentalService(id: string, svc: string, active = true) {
    return this.request("POST", `/profiles/${id}/parentalControl/services`, {
      body: { id: svc, active },
    });
  }
  patchParentalService(id: string, svc: string, active: boolean) {
    return this.request(
      "PATCH",
      `/profiles/${id}/parentalControl/services/${encodeURIComponent(svc)}`,
      { body: { active } },
    );
  }
  removeParentalService(id: string, svc: string) {
    return this.request(
      "DELETE",
      `/profiles/${id}/parentalControl/services/${encodeURIComponent(svc)}`,
    );
  }

  listParentalCategories(id: string) {
    return this.paginateAll<{ id: string; active: boolean }>(
      `/profiles/${id}/parentalControl/categories`,
    );
  }
  addParentalCategory(id: string, cat: string, active = true) {
    return this.request("POST", `/profiles/${id}/parentalControl/categories`, {
      body: { id: cat, active },
    });
  }
  patchParentalCategory(id: string, cat: string, active: boolean) {
    return this.request(
      "PATCH",
      `/profiles/${id}/parentalControl/categories/${encodeURIComponent(cat)}`,
      { body: { active } },
    );
  }
  removeParentalCategory(id: string, cat: string) {
    return this.request(
      "DELETE",
      `/profiles/${id}/parentalControl/categories/${encodeURIComponent(cat)}`,
    );
  }

  // ---------- Analytics ----------
  analytics(
    id: string,
    resource: string,
    series: boolean,
    query: Record<string, string | number | boolean | undefined>,
  ) {
    const path = `/profiles/${id}/analytics/${resource}${series ? ";series" : ""}`;
    return this.request<unknown>("GET", path, { query });
  }
  analyticsRaw(
    id: string,
    resource: string,
    series: boolean,
    query: Record<string, string | number | boolean | undefined>,
  ) {
    const path = `/profiles/${id}/analytics/${resource}${series ? ";series" : ""}`;
    return this.requestRaw<unknown>("GET", path, { query });
  }

  // ---------- Logs ----------
  listLogs(id: string, query: Record<string, string | number | boolean | undefined>) {
    return this.requestRaw<Array<Record<string, unknown>>>("GET", `/profiles/${id}/logs`, {
      query,
    });
  }
  clearLogs(id: string) {
    return this.request("DELETE", `/profiles/${id}/logs`);
  }
  downloadLogsUrl(id: string) {
    return this.request<{ url: string }>("GET", `/profiles/${id}/logs/download`, {
      query: { redirect: "0" },
    });
  }

  /** SSE stream of logs — yields parsed JSON per event. */
  async *streamLogs(
    id: string,
    query: Record<string, string | number | boolean | undefined> = {},
    signal?: AbortSignal,
  ): AsyncGenerator<Record<string, unknown>> {
    const url = this.buildUrl(`/profiles/${id}/logs/stream`, query);
    const res = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": this.apiKey,
        "Accept": "text/event-stream",
        "User-Agent": "ndns-cli",
      },
      signal,
    });
    if (!res.ok || !res.body) {
      throw new NextDnsApiError(res.status, [{ code: `http_${res.status}` }]);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      // SSE events separated by \n\n
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const rawEvent = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        // Collect data: lines
        const dataLines: string[] = [];
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) continue;
        const payload = dataLines.join("\n");
        try {
          yield JSON.parse(payload);
        } catch {
          // Non-JSON event (heartbeat) — skip
        }
      }
    }
  }
}

function safeJson(t: string): { errors?: ApiError[]; data?: unknown; meta?: unknown } | null {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
