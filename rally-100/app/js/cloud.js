/* RALLY 100: the cloud bridge. Plain fetch against Supabase auth (/auth/v1) and the rally100 server
   functions (/rest/v1/rpc/*, schema rally100). No SDK, no build step. Every call either returns the
   server's JSON or throws an Error with:
     kind: 'net'    (no signal, timeout, or a 5xx: the server, not the person, had a problem)
           'auth'   (the session is gone or expired: sign in again)
           'server' (a real "no" from the server, with a stable code)
     code: a stable token such as 'invalid_phone', 'not_installed', 'invalid_grant'. Screens map codes to
           wording with R100.say(code); raw database text is never shown. */
(function () {
  var R = window.R100 = window.R100 || {};
  var KEY = 'r100_session';
  var TIMEOUT = 15000;

  function cfg() { return window.RALLY100_CLOUD || {}; }
  function base() { return String(cfg().url || '').replace(/\/+$/, ''); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function read(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function fail(kind, code, message, status) { var e = new Error(message || code || kind); e.kind = kind; e.code = code || kind; e.status = status || 0; return e; }
  function tokenOf(msg) { var m = /rally100:\s*([a-z0-9_ ]+)/i.exec(String(msg || '')); return m ? m[1].trim().toLowerCase().replace(/\s+/g, '_') : null; }

  async function http(path, opts) {
    opts = opts || {};
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, opts.timeout || TIMEOUT);
    var headers = { apikey: cfg().anonKey || '', 'Content-Type': 'application/json' };
    if (opts.access) headers.Authorization = 'Bearer ' + opts.access;
    if (opts.profile) { headers['Content-Profile'] = opts.profile; headers['Accept-Profile'] = opts.profile; }
    var res;
    try {
      res = await fetch(base() + path, { method: opts.method || 'POST', headers: headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), signal: ctl.signal });
    } catch (e) {
      throw fail('net', 'offline', 'No connection');
    } finally {
      clearTimeout(timer);
    }
    var data = null;
    try { var text = await res.text(); data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      var msg = (data && (data.message || data.error_description || data.msg || data.error)) || ('Error ' + res.status);
      if (data && (data.code === 'PGRST106' || data.code === 'PGRST202' || data.code === 'PGRST205')) throw fail('server', 'not_installed', msg, res.status);
      if (res.status >= 500) throw fail('net', 'server', msg, res.status);
      if (res.status === 401) throw fail('auth', 'expired', msg, 401);
      var code = tokenOf(msg) || (data && (data.error_code || data.error)) || 'error';
      if (/email.*not.*confirmed/i.test(msg)) code = 'email_not_confirmed';
      if (/invalid login credentials/i.test(msg)) code = 'invalid_grant';
      throw fail('server', code, msg, res.status);
    }
    return data;
  }

  var session = read(KEY);
  function setSession(d) {
    if (!d) { session = null; store(KEY, null); return; }
    session = {
      access: d.access_token,
      refresh: d.refresh_token,
      expiresAt: d.expires_at ? d.expires_at * 1000 : Date.now() + (d.expires_in || 3600) * 1000,
      userId: d.user && d.user.id,
      email: d.user && d.user.email
    };
    store(KEY, session);
  }

  var refreshing = null;
  function refresh() {
    if (!session || !session.refresh) return Promise.reject(fail('auth', 'expired', 'Sign in again'));
    if (!refreshing) {
      refreshing = http('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: session.refresh } })
        .then(function (d) { setSession(d); return session; })
        .catch(function (e) { if (e.kind !== 'net') setSession(null); throw e.kind === 'net' ? e : fail('auth', 'expired', 'Sign in again'); })
        .finally(function () { refreshing = null; });
    }
    return refreshing;
  }
  async function access() {
    if (!session) throw fail('auth', 'signed_out', 'Sign in');
    if (session.expiresAt - Date.now() < 60000) await refresh();
    return session.access;
  }

  function here() { return location.origin + location.pathname; }
  function jwtSub(tok) { try { var b = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))).sub; } catch (e) { return null; } }

  R.cloud = {
    enabled: function () { return !!(cfg().url && cfg().anonKey); },
    /* Supabase hands a session back in the URL fragment after an email confirmation or a password
       reset link (#access_token=...&refresh_token=...&type=signup|recovery). Take it, then clean the URL. */
    fromLink: function () {
      var h = String(location.hash || '').replace(/^#/, ''); if (!h) return null;
      var q = {}; h.split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) q[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (q.error || q.error_code) return { error: q.error_description || q.error || 'link_error' };
      if (!q.access_token) return null;
      setSession({ access_token: q.access_token, refresh_token: q.refresh_token, expires_in: Number(q.expires_in || 3600), expires_at: q.expires_at ? Number(q.expires_at) : 0, user: { id: jwtSub(q.access_token) } });
      return { type: q.type || 'signin' };
    },
    updatePassword: async function (password) {
      var a = await access();
      await http('/auth/v1/user', { method: 'PUT', body: { password: password }, access: a });
      return true;
    },
    dev: function () { return !!cfg().dev; },
    session: function () { return session; },
    signIn: async function (email, password) {
      var d = await http('/auth/v1/token?grant_type=password', { body: { email: email, password: password } });
      setSession(d); return session;
    },
    signUp: async function (email, password, name) {
      var d = await http('/auth/v1/signup?redirect_to=' + encodeURIComponent(here()), { body: { email: email, password: password, data: { name: name || '' } } });
      if (d && d.access_token) { setSession(d); return { session: session }; }
      return { confirm: true };
    },
    recover: async function (email) { await http('/auth/v1/recover?redirect_to=' + encodeURIComponent(here()), { body: { email: email } }); return true; },
    signOut: async function () {
      var a = session && session.access;
      setSession(null);
      if (a) { try { await http('/auth/v1/logout', { access: a }); } catch (e) {} }
    },
    rpc: async function (name, params) {
      var a = await access();
      try {
        return await http('/rest/v1/rpc/' + name, { body: params || {}, access: a, profile: 'rally100' });
      } catch (e) {
        if (e.status === 401) {
          await refresh();
          return await http('/rest/v1/rpc/' + name, { body: params || {}, access: session.access, profile: 'rally100' });
        }
        throw e;
      }
    }
  };
})();
