#!/usr/bin/env node
// RALLY 100 — local stand-in for Supabase. DEVELOPMENT AND BROWSER TESTS ONLY;
// it is never deployed. Zero dependencies (Node 22).
//
//   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=rally100_dev PORT=8100 \
//     node rally-100/app/dev/server.mjs
//
// It serves rally-100/app/ as static files (index.html at /, no caching) and
// answers the three things the app asks Supabase for:
//   * /auth/v1/...            email + password sessions (accounts in users.json,
//                             plus any made through /auth/v1/signup while it runs)
//   * /rest/v1/rpc/<name>     with Content-Profile: rally100 — runs the REAL
//                             rally100.<name>() in Postgres exactly as PostgREST
//                             would: ONE transaction, `set local role authenticated`,
//                             request.jwt.claims = {"sub": <user id>}, and the
//                             JSON body bound as parameters. No SQL is ever built
//                             from request data: names come from pg_catalog,
//                             values travel as protocol parameters.
// Access tokens are opaque random strings held in memory (1 hour).
//
// It speaks the PostgreSQL wire protocol itself (startup, trust / cleartext /
// md5 / SCRAM-SHA-256 auth, simple and extended query) rather than shelling out
// to psql, because psql variables travel in argv and a single argument is
// capped at 128 KB — an incentive picture is up to 400,000 characters.

import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const PORT = Number(process.env.PORT || 8100);
const PG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'rally100_dev',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || ''
};
const TOKEN_TTL = 3600;          // seconds
const MAX_BODY = 8 * 1024 * 1024; // four 400 KB pictures plus JSON, with room to spare

// ================================================== PostgreSQL wire protocol ===
const i16 = (n) => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; };
const i32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
const cstr = (s) => Buffer.concat([Buffer.from(String(s), 'utf8'), Buffer.from([0])]);

function parseFields(body) {         // ErrorResponse / NoticeResponse
  const f = {};
  let i = 0;
  while (i < body.length && body[i] !== 0) {
    const k = String.fromCharCode(body[i]);
    const end = body.indexOf(0, i + 1);
    f[k] = body.toString('utf8', i + 1, end);
    i = end + 1;
  }
  return { code: f.C || 'XX000', message: f.M || 'error', details: f.D || null, hint: f.H || null };
}

function parseRow(body) {            // DataRow, text format
  const n = body.readInt16BE(0);
  const out = [];
  let o = 2;
  for (let k = 0; k < n; k++) {
    const len = body.readInt32BE(o); o += 4;
    if (len < 0) { out.push(null); continue; }
    out.push(body.toString('utf8', o, o + len)); o += len;
  }
  return out;
}

class Conn {
  constructor(sock) {
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.msgs = [];
    this.waiter = null;
    this.dead = null;
    this.tx = 'I';
    sock.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]); this.parse(); });
    sock.on('error', (e) => { this.dead = e; this.wake(); });
    sock.on('close', () => { this.dead = this.dead || new Error('connection closed'); this.wake(); });
  }
  parse() {
    while (this.buf.length >= 5) {
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < 1 + len) break;
      this.msgs.push({ type: String.fromCharCode(this.buf[0]), body: this.buf.subarray(5, 1 + len) });
      this.buf = this.buf.subarray(1 + len);
    }
    this.wake();
  }
  wake() { const w = this.waiter; this.waiter = null; if (w) w(); }
  async next() {
    while (!this.msgs.length) {
      if (this.dead) throw this.dead;
      await new Promise((r) => { this.waiter = r; });
    }
    return this.msgs.shift();
  }
  send(type, body) {
    const head = type ? Buffer.from(type, 'ascii') : Buffer.alloc(0);
    this.sock.write(Buffer.concat([head, i32(body.length + 4), body]));
  }
  async collect() {                  // read until ReadyForQuery; first error wins
    const rows = [];
    let error = null;
    for (;;) {
      const m = await this.next();
      if (m.type === 'D') rows.push(parseRow(m.body));
      else if (m.type === 'E') error = error || parseFields(m.body);
      else if (m.type === 'Z') { this.tx = String.fromCharCode(m.body[0]); return { rows, error }; }
    }
  }
  simple(sql) { this.send('Q', cstr(sql)); return this.collect(); }
  // extended protocol: unnamed statement, text parameters, text results
  query(sql, params = []) {
    this.send('P', Buffer.concat([cstr(''), cstr(sql), i16(0)]));
    const parts = [cstr(''), cstr(''), i16(0), i16(params.length)];
    for (const v of params) {
      if (v === null || v === undefined) { parts.push(i32(-1)); continue; }
      const b = Buffer.from(String(v), 'utf8');
      parts.push(i32(b.length), b);
    }
    parts.push(i16(0));
    this.send('B', Buffer.concat(parts));
    this.send('E', Buffer.concat([cstr(''), i32(0)]));
    this.send('S', Buffer.alloc(0));
    return this.collect();
  }
  close() { try { this.send('X', Buffer.alloc(0)); } catch (e) { /* already gone */ } this.sock.destroy(); }
}

const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest();
const md5hex = (b) => crypto.createHash('md5').update(b).digest('hex');

async function connect() {
  const sock = PG.host.startsWith('/')
    ? net.connect({ path: path.join(PG.host, `.s.PGSQL.${PG.port}`) })
    : net.connect({ host: PG.host, port: PG.port });
  await new Promise((resolve, reject) => { sock.once('connect', resolve); sock.once('error', reject); });
  const c = new Conn(sock);
  c.send(null, Buffer.concat([i32(196608), cstr('user'), cstr(PG.user), cstr('database'), cstr(PG.database),
    cstr('client_encoding'), cstr('UTF8'), cstr('application_name'), cstr('rally100-dev-server'), Buffer.from([0])]));
  let nonce = '', firstBare = '', serverSig = '';
  for (;;) {
    const m = await c.next();
    if (m.type === 'E') { c.close(); throw new Error(parseFields(m.body).message); }
    if (m.type === 'Z') { c.tx = String.fromCharCode(m.body[0]); return c; }
    if (m.type !== 'R') continue;    // ParameterStatus, BackendKeyData, notices
    const code = m.body.readInt32BE(0);
    if (code === 0) continue;
    if (code === 3) { c.send('p', cstr(PG.password)); continue; }
    if (code === 5) {
      const salt = m.body.subarray(4, 8);
      c.send('p', cstr('md5' + md5hex(Buffer.concat([Buffer.from(md5hex(PG.password + PG.user)), salt]))));
      continue;
    }
    if (code === 10) {               // SASL: SCRAM-SHA-256
      const mechs = m.body.toString('utf8', 4).split('\0');
      if (!mechs.includes('SCRAM-SHA-256')) throw new Error('server offers no SCRAM-SHA-256');
      nonce = crypto.randomBytes(18).toString('base64');
      firstBare = 'n=,r=' + nonce;
      const first = Buffer.from('n,,' + firstBare);
      c.send('p', Buffer.concat([cstr('SCRAM-SHA-256'), i32(first.length), first]));
      continue;
    }
    if (code === 11) {
      const serverFirst = m.body.toString('utf8', 4);
      const kv = Object.fromEntries(serverFirst.split(',').map((p) => [p[0], p.slice(2)]));
      if (!kv.r || !kv.r.startsWith(nonce)) throw new Error('SCRAM: bad server nonce');
      const salted = crypto.pbkdf2Sync(PG.password, Buffer.from(kv.s, 'base64'), Number(kv.i), 32, 'sha256');
      const clientKey = hmac(salted, 'Client Key');
      const storedKey = crypto.createHash('sha256').update(clientKey).digest();
      const finalNoProof = 'c=biws,r=' + kv.r;
      const authMessage = firstBare + ',' + serverFirst + ',' + finalNoProof;
      const sig = hmac(storedKey, authMessage);
      const proof = Buffer.from(clientKey.map((b, k) => b ^ sig[k]));
      serverSig = hmac(hmac(salted, 'Server Key'), authMessage).toString('base64');
      c.send('p', Buffer.from(finalNoProof + ',p=' + proof.toString('base64')));
      continue;
    }
    if (code === 12) {
      if (m.body.toString('utf8', 4) !== 'v=' + serverSig) throw new Error('SCRAM: server signature mismatch');
      continue;
    }
    throw new Error('unsupported authentication method ' + code);
  }
}

const idle = [];
async function withConn(fn) {
  const c = idle.pop() || await connect();
  try {
    return await fn(c);
  } finally {
    if (!c.dead && c.tx === 'I' && idle.length < 4) idle.push(c); else c.close();
  }
}

// ======================================================= function catalog ===
// Each rally100 function's argument names and types, read ONCE from
// pg_catalog (and re-read once on a miss, so applying the migration after the
// server started still works). Types come back schema-qualified.
let catalog = null;
async function loadCatalog() {
  const r = await withConn((c) => c.query(`
    select coalesce(json_agg(json_build_object(
             'name', p.proname,
             'ndefaults', p.pronargdefaults,
             'args', (select coalesce(json_agg(json_build_object(
                                'name', p.proargnames[u.i],
                                'type', quote_ident(tn.nspname) || '.' || quote_ident(ty.typname)) order by u.i), '[]'::json)
                        from unnest(p.proargtypes::oid[]) with ordinality u(oid, i)
                        join pg_catalog.pg_type ty on ty.oid = u.oid
                        join pg_catalog.pg_namespace tn on tn.oid = ty.typnamespace))), '[]'::json)::text
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'rally100' and p.prokind = 'f'`));
  if (r.error) throw new Error(r.error.message);
  catalog = new Map(JSON.parse(r.rows[0][0]).map((f) => [f.name, f]));
}
async function lookup(name) {
  if (!catalog) await loadCatalog();
  if (!catalog.has(name)) await loadCatalog();
  return catalog.get(name) || null;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const qi = (s) => { if (!IDENT.test(s)) throw new Error('bad identifier'); return '"' + s + '"'; };
const qtype = (t) => t.split('.').map((p) => (p.startsWith('"') ? p : qi(p))).join('.');

function paramText(v, type) {
  if (v === null || v === undefined) return null;
  if (type.endsWith('.jsonb') || type.endsWith('.json')) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);  // the cast will refuse it: 400
  return String(v);
}

// PostgREST-like status for a Postgres error
function statusFor(code) {
  if (code === '42501') return 403;
  if (code === '42883' || code === '42P01') return 404;
  if (code === '23505' || code === '23503' || code === '40001' || code === '40P01') return 409;
  if (/^(08|53|57|58|XX)/.test(code)) return 503;
  return 400;
}

async function callRpc(name, body, uid) {
  const fn = IDENT.test(name) ? await lookup(name) : null;
  const keys = Object.keys(body);
  const names = fn ? fn.args.map((a) => a.name) : [];
  const required = fn ? names.slice(0, names.length - fn.ndefaults) : [];
  if (!fn || keys.some((k) => !names.includes(k)) || required.some((k) => !keys.includes(k))) {
    return [404, { code: 'PGRST202', details: null,
      hint: 'Check the function name and that every parameter name matches.',
      message: `Could not find the function rally100.${name}(${keys.join(', ')}) in the schema cache` }];
  }
  const used = fn.args.filter((a) => keys.includes(a.name));
  const sql = `select rally100.${qi(name)}(${used.map((a, i) => `${qi(a.name)} := $${i + 1}::${qtype(a.type)}`).join(', ')})::text`;
  const params = used.map((a) => paramText(body[a.name], a.type));
  return withConn(async (c) => {
    let r = await c.simple("begin; set local role authenticated; set local statement_timeout = '20s'");
    if (!r.error) r = await c.query("select pg_catalog.set_config('request.jwt.claims', $1, true)",
                                    [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    if (!r.error) r = await c.query(sql, params);
    if (r.error) {
      await c.simple('rollback');
      const e = r.error;
      return [statusFor(e.code), { code: e.code, message: e.message, details: e.details, hint: e.hint }];
    }
    const done = await c.simple('commit');
    if (done.error) return [statusFor(done.error.code), done.error];
    return [200, r.rows.length ? r.rows[0][0] : 'null', true];
  });
}

// ============================================================ dev auth ===
const passwords = new Map();          // lower(email) -> password
try {
  for (const u of JSON.parse(fs.readFileSync(path.join(HERE, 'users.json'), 'utf8')).users) {
    passwords.set(String(u.email).toLowerCase(), String(u.password));
  }
} catch (e) {
  console.error('could not read app/dev/users.json:', e.message);
}
const access = new Map();             // token -> { uid, email, exp, refresh }
const refreshes = new Map();          // token -> { uid, email }

function samePassword(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function session(uid, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const refresh = crypto.randomBytes(24).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  access.set(token, { uid, email, exp: now + TOKEN_TTL, refresh });
  refreshes.set(refresh, { uid, email });
  return { access_token: token, token_type: 'bearer', expires_in: TOKEN_TTL, expires_at: now + TOKEN_TTL,
           refresh_token: refresh, user: { id: uid, email, aud: 'authenticated', role: 'authenticated' } };
}
function bearer(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  const s = access.get(m[1]);
  if (!s) return null;
  if (s.exp <= Math.floor(Date.now() / 1000)) { access.delete(m[1]); return null; }
  return { token: m[1], ...s };
}
async function userIdFor(email) {
  const r = await withConn((c) => c.query('select id::text from auth.users where lower(email) = lower($1)', [email]));
  if (r.error) throw new Error(r.error.message);
  return r.rows.length ? r.rows[0][0] : null;
}
const authError = (error, description, status = 400) => [status, { error, error_description: description, error_code: error, msg: description }];

async function handleAuth(req, url, body) {
  const route = url.pathname.replace(/^\/auth\/v1\//, '');
  if (route === 'token' && req.method === 'POST') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const email = String(body.email || '').trim().toLowerCase();
      const known = passwords.get(email);
      if (!email || known === undefined || !samePassword(known, body.password || '')) {
        return authError('invalid_grant', 'Invalid login credentials');
      }
      const uid = await userIdFor(email);
      if (!uid) return authError('invalid_grant', 'Invalid login credentials');
      return [200, session(uid, email)];
    }
    if (grant === 'refresh_token') {
      const r = refreshes.get(String(body.refresh_token || ''));
      if (!r) return authError('invalid_grant', 'Invalid Refresh Token: Refresh Token Not Found');
      refreshes.delete(String(body.refresh_token));
      return [200, session(r.uid, r.email)];
    }
    return authError('unsupported_grant_type', 'grant_type must be password or refresh_token');
  }
  if (route === 'logout' && req.method === 'POST') {
    const s = bearer(req);
    if (s) { access.delete(s.token); refreshes.delete(s.refresh); }
    return [204, null];
  }
  if (route === 'signup' && req.method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return authError('validation_failed', 'Unable to validate email address: invalid format');
    if (password.length < 6) return authError('weak_password', 'Password should be at least 6 characters.');
    if (passwords.has(email) || await userIdFor(email)) return authError('user_already_exists', 'User already registered');
    const name = String((body.data && body.data.name) || '').slice(0, 120);
    const uid = crypto.randomUUID();
    // the RALLY signup trigger makes the least-authority profile: role rep, no team
    const r = await withConn((c) => c.query(
      "insert into auth.users (id, email, raw_user_meta_data) values ($1::uuid, $2, pg_catalog.jsonb_build_object('name', $3::text))",
      [uid, email, name]));
    if (r.error) return authError('unexpected_failure', r.error.message, 500);
    passwords.set(email, password);
    return [200, session(uid, email)];
  }
  if (route === 'recover' && req.method === 'POST') return [204, null];
  if (route === 'user' && (req.method === 'GET' || req.method === 'PUT')) {
    const s = bearer(req);
    if (!s) return authError('bad_jwt', 'invalid JWT: unable to parse or verify signature', 401);
    if (req.method === 'PUT' && body.password !== undefined) {
      if (String(body.password).length < 6) return authError('weak_password', 'Password should be at least 6 characters.');
      passwords.set(s.email, String(body.password));
    }
    return [200, { id: s.uid, email: s.email, aud: 'authenticated', role: 'authenticated' }];
  }
  return authError('not_found', 'No such auth endpoint', 404);
}

// ========================================================= static files ===
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json'
};
function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'bad path', 'text/plain'); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const segs = rel.split('/').filter(Boolean);
  // never serve dotfiles, and never the dev folder (it holds the dev passwords)
  if (segs.some((s) => s.startsWith('.')) || segs[0] === 'dev') return send(res, 404, 'not found', 'text/plain');
  let file = path.resolve(APP, ...segs);
  if (file !== APP && !file.startsWith(APP + path.sep)) return send(res, 404, 'not found', 'text/plain');
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const data = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
                         'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) {
    send(res, 404, 'not found', 'text/plain');
  }
}

// =============================================================== server ===
function send(res, status, body, type = 'application/json; charset=utf-8', raw = false) {
  if (status === 204 || body === null) { res.writeHead(status, { 'Cache-Control': 'no-store' }); return res.end(); }
  const text = raw || typeof body === 'string' ? String(body) : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store' });
  res.end(text);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  const url = new URL(req.url, 'http://localhost');
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`);
  });
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { Allow: 'GET, HEAD, POST, PUT, OPTIONS', 'Cache-Control': 'no-store' });
      return res.end();
    }
    const isAuth = url.pathname.startsWith('/auth/v1/');
    const isRpc = url.pathname.startsWith('/rest/v1/rpc/');
    if (!isAuth && !isRpc) {
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url);
      return send(res, 405, { message: 'method not allowed' });
    }
    let body = {};
    const text = await readBody(req);
    if (text.trim()) {
      try { body = JSON.parse(text); } catch (e) {
        return send(res, 400, { code: 'PGRST102', message: 'Empty or invalid json', details: null, hint: null });
      }
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return send(res, 400, { code: 'PGRST102', message: 'The request body must be a JSON object', details: null, hint: null });
    }
    if (isAuth) {
      const [status, out] = await handleAuth(req, url, body);
      return send(res, status, out);
    }
    if (req.method !== 'POST') return send(res, 405, { code: 'PGRST117', message: 'Unsupported HTTP method', details: null, hint: null });
    const profile = req.headers['content-profile'] || req.headers['accept-profile'];
    if (profile !== 'rally100') {
      return send(res, 406, { code: 'PGRST106', message: 'The schema must be one of the following: rally100', details: null, hint: null });
    }
    const who = bearer(req);
    if (!who) return send(res, 401, { code: 'PGRST301', message: 'JWT expired', details: null, hint: null });
    const name = decodeURIComponent(url.pathname.slice('/rest/v1/rpc/'.length));
    const [status, out, raw] = await callRpc(name, body, who.uid);
    return send(res, status, out, 'application/json; charset=utf-8', raw);
  } catch (e) {
    if (e.status === 413) return send(res, 413, { code: 'PGRST413', message: 'Payload too large', details: null, hint: null });
    console.error(e);
    return send(res, 503, { code: 'PGRST000', message: 'Database unavailable: ' + e.message, details: null, hint: null });
  }
});

server.listen(PORT, () => {
  console.log(`RALLY 100 dev server (LOCAL ONLY): http://localhost:${PORT}  ->  postgres ${PG.host}:${PG.port}/${PG.database}`);
});
