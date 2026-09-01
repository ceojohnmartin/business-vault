/* RALLY — the cloud bridge (Phase 1: authentication only).
   Talks to Supabase's auth (/auth/v1) and data (/rest/v1) endpoints with
   plain fetch — no SDK, no build step, nothing new to break offline. With
   cloud unconfigured every entry point is a fast no-op and RALLY stays the
   pure local-first app.

   Deliberate Phase 1 scope: sign-in / sign-up / sign-out, token refresh,
   and reading the caller's own profile row. NO app data syncs here —
   that is Phase 2, behind its own approval. */
(function () {
  const KEY_TOKENS = "cloudSession";   // { access, refresh, expiresAt, userId }
  // { id, teamId, role, roleVerifiedAt, name, email, disabled }
  // This record is the ONE durable trusted-role source in RALLY. Nothing
  // else may author a role: STORE mirrors it, the UI derives from STORE.
  const KEY_PROFILE = "cloudProfile";
  const TIMEOUT_MS = 6000;             // a dead zone must fail FAST into offline mode

  const cfg = () => window.RALLY_CLOUD || {};
  const enabled = () => !!(cfg().url && cfg().anonKey);
  const base = () => String(cfg().url || "").replace(/\/+$/, "");

  // net vs auth is the load-bearing distinction: network trouble falls back
  // to the device unlock, a real server "no" never does
  function fail(kind, message) {
    const e = new Error(message);
    e.cloud = kind; // "net" | "auth"
    return e;
  }

  async function call(path, opts) {
    const { method = "GET", body, access, timeout = TIMEOUT_MS } = opts || {};
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    let res;
    try {
      const headers = { apikey: cfg().anonKey, "Content-Type": "application/json" };
      if (access) headers.Authorization = "Bearer " + access;
      res = await fetch(base() + path, {
        method, headers, signal: ctl.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (_) {
      throw fail("net", "Can't reach RALLY cloud");
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* 204s and empty bodies */ }
    if (!res.ok) {
      const msg = (data && (data.error_description || data.msg || data.message || data.error))
        || ("Cloud error " + res.status);
      // 5xx is the server having a bad day, not a verdict on the rep
      throw fail(res.status >= 500 ? "net" : "auth", msg);
    }
    return data;
  }

  const saveTokens = (t) => MDB.kvSet(KEY_TOKENS, t);
  const getTokens = () => MDB.kvGet(KEY_TOKENS, null);
  const getProfile = () => MDB.kvGet(KEY_PROFILE, null);

  function pack(d) {
    return {
      access: d.access_token,
      refresh: d.refresh_token,
      expiresAt: Date.now() + (d.expires_in || 3600) * 1000,
      userId: d.user && d.user.id,
    };
  }

  async function signIn(email, password) {
    const d = await call("/auth/v1/token?grant_type=password", {
      method: "POST", body: { email, password },
    });
    const t = pack(d);
    await saveTokens(t);
    return t;
  }

  async function signUp(email, password, name) {
    const d = await call("/auth/v1/signup", {
      method: "POST", body: { email, password, data: { name: name || "" } },
    });
    // no session back = email confirmation is on: the account exists but
    // the rep confirms first, then signs in
    if (!d || !d.access_token) return { pendingConfirm: true };
    const t = pack(d);
    await saveTokens(t);
    return t;
  }

  /* Persist a profile row the server just gave us, and hand the role to
     STORE in the same breath. Cache write and mirror happen together so
     cloudProfile can never say "manager" while users[] says "rep" — one
     trusted role, one verification timestamp, one precedence rule. */
  async function applyProfileRow(r) {
    if (!r) return null;
    const p = {
      id: r.id, teamId: r.team_id, role: r.role, roleVerifiedAt: Date.now(),
      name: r.name, email: r.email, disabled: !!r.disabled,
    };
    await MDB.kvSet(KEY_PROFILE, p);
    if (window.STORE && STORE.applyServerRole) {
      await STORE.applyServerRole(p.role, p.roleVerifiedAt, p.id).catch(() => {});
    }
    return p;
  }

  async function fetchProfile(access, userId) {
    if (!userId) return null;
    const rows = await call(
      "/rest/v1/profiles?id=eq." + encodeURIComponent(userId) +
      "&select=id,team_id,role,name,email,disabled",
      { access });
    const r = Array.isArray(rows) ? rows[0] : null;
    if (!r) return null;
    return applyProfileRow(r);
  }

  // Single-flight: the background revalidate and a sync cycle can want a
  // refresh at the same moment. GoTrue rotates refresh tokens, so two
  // racing refreshes would invalidate each other and bounce the rep to
  // the gate for no reason — everyone shares one in-flight refresh.
  let refreshing = null;
  function refresh() {
    if (!refreshing) {
      refreshing = (async () => {
        const t = await getTokens();
        if (!t || !t.refresh) throw fail("auth", "No cloud session");
        const d = await call("/auth/v1/token?grant_type=refresh_token", {
          method: "POST", body: { refresh_token: t.refresh },
        });
        const nt = pack(d);
        if (!nt.userId) nt.userId = t.userId;
        await saveTokens(nt);
        return nt;
      })().finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  // clears this device's cloud session; tells the server when it can
  async function signOut() {
    const t = await getTokens();
    await MDB.kvSet(KEY_TOKENS, null);
    await MDB.kvSet(KEY_PROFILE, null);
    if (!enabled() || !t || !t.access) return;
    try {
      await call("/auth/v1/logout", { method: "POST", access: t.access, timeout: 3000 });
    } catch (_) { /* best effort — the local session is already gone */ }
  }

  /* Background standing-check on launch: is this signed-in device still
     welcome? Only a DEFINITIVE server "no" ever locks the app — network
     trouble never does, because a rep in a dead zone is exactly who RALLY
     serves. Returns "off" | "none" | "ok" | "offline" | "disabled" | "revoked". */
  async function revalidate() {
    if (!enabled()) return "off";
    let t = await getTokens();
    if (!t) return "none"; // local-only unlock (legacy) — nothing to check
    try {
      if (Date.now() > t.expiresAt - 120e3) t = await refresh();
      const p = await fetchProfile(t.access, t.userId);
      if (p && p.disabled) return "disabled";
      return "ok";
    } catch (e) {
      return e.cloud === "auth" ? "revoked" : "offline";
    }
  }

  /* Authenticated data-plane call (PostgREST). Returns {status, data,
     headers}; refreshes the access token once on a 401 and retries. Throws
     the same net/auth-flavored errors as call() so callers can tell a dead
     zone from a real denial. Used by the sync engine — auth flows above
     stay on call() directly. */
  async function api(path, opts) {
    const o = opts || {};
    let t = await getTokens();
    if (!t || !t.access) throw fail("auth", "No cloud session");
    if (Date.now() > t.expiresAt - 60e3) t = await refresh();
    const run = async (access) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), o.timeout || 20000);
      let res;
      try {
        const headers = Object.assign(
          { apikey: cfg().anonKey, "Content-Type": "application/json",
            Authorization: "Bearer " + access },
          o.headers || {});
        res = await fetch(base() + path, {
          method: o.method || "GET", headers, signal: ctl.signal,
          body: o.body === undefined ? undefined : JSON.stringify(o.body),
        });
      } catch (_) {
        throw fail("net", "Can't reach RALLY cloud");
      } finally { clearTimeout(timer); }
      let data = null;
      try { data = await res.json(); } catch (_) {}
      return { status: res.status, data, ok: res.ok };
    };
    let r = await run(t.access);
    if (r.status === 401) {
      t = await refresh(); // throws auth if the session is truly dead
      r = await run(t.access);
    }
    return r;
  }

  window.MCLOUD = {
    enabled, signIn, signUp, signOut, refresh, fetchProfile, applyProfileRow,
    revalidate, getTokens, getProfile, api,
  };
})();
