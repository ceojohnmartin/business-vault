#!/usr/bin/env node
// RALLY 100 — smoke test for the LOCAL dev server. It starts nothing itself:
// point it at a running app/dev/server.mjs (on a database built by
// app/dev/setup-db.sh) and it walks one rep and one leader through the real
// HTTP surface the app uses.
//
//   node rally-100/app/dev/smoke.mjs http://localhost:8100
//
// Prints PASS or FAIL (and exits 0 or 1). Safe to run repeatedly: each run
// adds three new fictional contacts (555-01xx numbers) to rep1's list.
import crypto from 'node:crypto';

const BASE = (process.argv[2] || process.env.RALLY100_URL || 'http://localhost:8100').replace(/\/+$/, '');
const PASSWORD = 'rally100dev';
const checks = [];
const check = (ok, label) => { checks.push([!!ok, label]); console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };

async function post(path, body, token, profile = 'rally100') {
  const headers = { 'Content-Type': 'application/json', apikey: 'dev-local' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (path.startsWith('/rest/')) { headers['Content-Profile'] = profile; headers['Accept-Profile'] = profile; }
  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = { raw: text }; }
  return { status: res.status, json };
}
const signIn = async (email) => (await post('/auth/v1/token?grant_type=password', { email, password: PASSWORD })).json;
const rpc = (name, params, token) => post('/rest/v1/rpc/' + name, params, token);

async function main() {
  const page = await fetch(BASE + '/');
  check(page.status === 200 && (page.headers.get('cache-control') || '').includes('no-store'), 'GET / serves the app, uncached');
  const leak = await fetch(BASE + '/dev/users.json');
  check(leak.status === 404, 'the dev folder (dev passwords) is not served');

  const bad = await post('/auth/v1/token?grant_type=password', { email: 'rep1@rally.test', password: 'wrong' });
  check(bad.status === 400 && bad.json.error === 'invalid_grant', 'a wrong password is refused with invalid_grant');
  const noToken = await rpc('rep_state', {}, null);
  check(noToken.status === 401 && noToken.json.code === 'PGRST301', 'an RPC without a token is 401 PGRST301');

  const rep = await signIn('rep1@rally.test');
  check(rep && rep.access_token && rep.token_type === 'bearer' && rep.user && rep.user.id, 'rep1 signs in (Supabase-shaped session)');
  if (!rep || !rep.access_token) throw new Error('rep1 could not sign in');

  const who = await rpc('whoami', {}, rep.access_token);
  check(who.status === 200 && who.json.user && who.json.user.email === 'rep1@rally.test' && who.json.user.team_name === 'RALLY',
    'whoami answers as rep1 on team RALLY');

  const ids = [];
  for (let k = 0; k < 3; k++) {
    const id = crypto.randomUUID();
    const tail = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    const r = await rpc('save_entry', { p: {
      id, first_name: ['Avery', 'Blake', 'Casey'][k], last_name: 'Smoke' + crypto.randomBytes(2).toString('hex'),
      phone: `(${700 + k * 11}) 555-01${tail}`, handle: '@smoke_' + id.slice(0, 8), platform: 'Instagram',
      tags: ['Work'], scene: 'shift' } }, rep.access_token);
    check(r.status === 200 && r.json.entry && r.json.entry.id === id && r.json.entry.is_complete === true,
      `save_entry ${k + 1}/3 stores a complete contact`);
    ids.push(id);
  }
  const retry = await rpc('save_entry', { p: { id: ids[0], notes: 'retried from the outbox' } }, rep.access_token);
  check(retry.status === 200 && retry.json.entry.id === ids[0] && retry.json.entry.notes === 'retried from the outbox',
    'a retried save_entry with the same id is an update');

  const state = await rpc('rep_state', {}, rep.access_token);
  const mine = state.json && state.json.entries ? state.json.entries.filter((e) => ids.includes(e.id)) : [];
  check(state.status === 200 && mine.length === 3 && mine.every((e) => e.counted) && state.json.count >= 3,
    'rep_state lists the three new contacts, counted');

  const notLeader = await rpc('team_state', {}, rep.access_token);
  check(notLeader.status === 403 && /rally100: not_allowed/.test(notLeader.json.message), 'a rep asking for team_state gets 403 not_allowed');
  const badInput = await rpc('save_entry', { p: { id: crypto.randomUUID(), first_name: 'X', phone: '555' } }, rep.access_token);
  check(badInput.status === 400 && badInput.json.code === '22023' && /rally100: invalid_phone/.test(badInput.json.message),
    'a bad phone is 400 with rally100: invalid_phone');
  const unknown = await rpc('no_such_function', {}, rep.access_token);
  check(unknown.status === 404 && unknown.json.code === 'PGRST202', 'an unknown function is 404 PGRST202');

  const lead = await signIn('leader@rally.test');
  if (!lead || !lead.access_token) throw new Error('leader could not sign in');
  const team = await rpc('team_state', {}, lead.access_token);
  const row = team.json && team.json.reps ? team.json.reps.find((r) => r.email === 'rep1@rally.test') : null;
  check(team.status === 200 && row && row.count >= 3 && team.json.queues && team.json.counts,
    'the leader reads team_state, with rep1 and the new count');

  const refreshed = await post('/auth/v1/token?grant_type=refresh_token', { refresh_token: lead.refresh_token });
  check(refreshed.status === 200 && refreshed.json.access_token && refreshed.json.access_token !== lead.access_token,
    'a refresh token returns a new session');
}

main().then(() => {
  const failed = checks.filter(([ok]) => !ok).length;
  console.log(failed ? `FAIL (${failed} of ${checks.length} checks failed)` : `PASS (${checks.length} checks)`);
  process.exit(failed ? 1 : 0);
}).catch((e) => {
  console.log('FAIL', e.message);
  process.exit(1);
});
