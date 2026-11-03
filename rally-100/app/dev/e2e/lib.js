/* Shared helpers for the RALLY 100 cross-role browser test (run against app/dev/server.mjs, never the live project).
   Needs Playwright with Chromium installed (require('playwright')). */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8103';
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'rally100-e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0, passes = 0;
function ok(cond, label) {
  if (cond) { passes++; console.log('PASS:', label); }
  else { failures++; console.log('FAIL:', label); }
  return !!cond;
}
function summary() { console.log(`\n${passes} passed, ${failures} failed`); return failures; }

/* Direct API access (same calls the app makes), for seeding and for checking server truth. */
async function api(pathname, body, token, method) {
  const headers = { 'Content-Type': 'application/json', apikey: 'dev-local' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (pathname.startsWith('/rest/')) { headers['Content-Profile'] = 'rally100'; headers['Accept-Profile'] = 'rally100'; }
  const res = await fetch(BASE + pathname, { method: method || 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) { const e = new Error(`${pathname} ${res.status} ${text.slice(0, 300)}`); e.status = res.status; e.data = data; throw e; }
  return data;
}
async function token(email) {
  const d = await api('/auth/v1/token?grant_type=password', { email, password: 'rally100dev' });
  return d.access_token;
}
const rpc = (tok, name, params) => api('/rest/v1/rpc/' + name, params || {}, tok);

/* A browser page with console-error capture and overflow checks. */
async function newPage(browser, kind) {
  const ctx = kind === 'phone'
    ? await browser.newContext({ ...devices['iPhone 13'] })
    : kind === 'small'
      ? await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
      : await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', (e) => page._errors.push('pageerror: ' + e.message));
  return page;
}
async function signIn(page, email) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#siEmail', { timeout: 15000 });
  await page.fill('#siEmail', email);
  await page.fill('#siPass', 'rally100dev');
  await page.click('#siBtn');
}
async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function shot(page, name) {
  const f = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: f, fullPage: false });
  return f;
}
async function screenName(page) { return page.evaluate(() => window.R100 && window.R100.view && window.R100.view.name); }
async function waitScreen(page, name, timeout) {
  await page.waitForFunction((n) => window.R100 && window.R100.view && window.R100.view.name === n, name, { timeout: timeout || 15000 });
  await page.waitForTimeout(250);
}
async function text(page) { return page.evaluate(() => document.getElementById('app').innerText); }
async function dismissOverlays(page) {
  for (let i = 0; i < 12; i++) {
    const o = await page.$('.overlay');
    if (!o) break;
    try { await o.click({ timeout: 1000 }); } catch (e) {}
    await page.waitForTimeout(150);
  }
}

module.exports = { chromium, devices, BASE, SHOTS, ok, summary, api, token, rpc, newPage, signIn, overflow, shot, screenName, waitScreen, text, dismissOverlays };
