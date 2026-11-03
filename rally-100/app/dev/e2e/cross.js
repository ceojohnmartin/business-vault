/* RALLY 100 cross-role end-to-end test. Every role acts through its own screens in a real browser against the
   real backend (app/dev/server.mjs over Postgres with migration 1001). Only bulk seeding (99 names) uses the API.
   Run:  sh rally-100/app/dev/e2e/run.sh   (see app/dev/README.md) */
const L = require('./lib');
const { ok, rpc, token, newPage, signIn, overflow, shot, waitScreen, text, dismissOverlays, BASE } = L;
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');

const REP = 'rep3@rally.test';
const PSQL = (sql) => execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', process.env.PGDATABASE || 'rally100_dev', '-c', sql],
  { env: process.env }).toString().trim();

async function body(page) {
  return page.evaluate(() => {
    const c = document.body.cloneNode(true); c.querySelectorAll('script,style').forEach((x) => x.remove());
    c.querySelectorAll('*').forEach((x) => { if (/^(DIV|P|SECTION|BUTTON|H1|H2|H3|MAIN|LABEL|SUMMARY|TD|TH|LI|SPAN)$/.test(x.tagName)) x.append(' '); });
    return c.textContent.replace(/\s+/g, ' ');
  });
}
async function goScreen(page, name, p) { await page.evaluate(([n, q]) => { R100.data.repAt = 0; R100.go(n, q || {}); }, [name, p || {}]); await page.waitForTimeout(800); }
async function noScroll(page, label) { const o = await overflow(page); ok(o <= 0, `no sideways scroll: ${label} (${o}px)`); }
async function toastsSeen(page) { return page.evaluate(() => Array.from(document.querySelectorAll('.toast')).map((t) => t.textContent)); }
let seq = 0;
function seedEntry(i) {
  seq++;
  return { id: crypto.randomUUID(), first_name: 'Seed' + i, last_name: 'Person' + i, phone: '615' + String(5550000 + i).slice(-7), handle: 'cross.seed.' + i, platform: 'Instagram', tags: ['School'] };
}

(async () => {
  const browser = await L.chromium.launch();
  const repTok = await token(REP), leadTok = await token('leader@rally.test'), ownTok = await token('owner@rally.test');
  const pages = [];
  try {
    /* ---------------------------------------------------------------- 1. rep: onboarding, 99 + the 100th */
    const rp = await newPage(browser, 'phone'); pages.push(rp);
    await signIn(rp, REP);
    await rp.waitForSelector('main.ob');
    ok(true, 'rep3 signs in and lands on onboarding');
    for (let i = 0; i < 3; i++) await rp.click('[data-a="ob-next"]');
    await shot(rp, '01-rep-onboarding-card4');
    await rp.check('#ackBox'); await rp.click('#obGo');
    await rp.waitForSelector('.wall');
    await noScroll(rp, 'rep home, empty');
    await shot(rp, '02-rep-home-empty');

    for (let i = 0; i < 99; i++) await rpc(repTok, 'save_entry', { p: seedEntry(i) });
    /* the 100th through the contact form */
    await goScreen(rp, 'contact', { id: null, from: 'network' });
    await rp.fill('#fFirst', 'Marcus'); await rp.fill('#fLast', 'Lee');
    await rp.fill('#fPhone', '(615) 555-0999'); await rp.fill('#fHandle', '@marcus.lee');
    await rp.click('[data-a="plat"][data-v="Instagram"]');
    await rp.click('[data-a="c-save"]');
    await rp.waitForSelector('.cg', { timeout: 10000 });
    const cg = await text(rp);
    ok(cg.includes('100/100 complete. Congratulations! Show this to your leader and walk through your list and signed friends together to confirm your prize!'), 'the 100th name opens the congratulations screen with the owner\'s exact words');
    ok(!/\$100 earned|earned \$/i.test(cg), 'no money shown as earned at 100');
    await rp.waitForTimeout(900); await dismissOverlays(rp);
    await shot(rp, '03-rep-congrats');

    /* ---------------------------------------------------------------- 2. rep: introduce Marcus */
    const st = await rpc(repTok, 'rep_state', {});
    const marcus = st.entries.find((e) => e.first_name === 'Marcus');
    ok(st.count === 100 && marcus && marcus.counted, 'server count is 100 and Marcus counts');
    await goScreen(rp, 'intro', { id: marcus.id });
    await rp.click('[data-a="plan"]'); await rp.waitForTimeout(900);
    await rp.click('main [data-a="ri-open"]');
    await rp.click('[data-g="how"][data-v="text"]'); await rp.click('[data-g="said"][data-v="in"]');
    await shot(rp, '04-rep-intro-sheet');
    await rp.click('#riSave'); await rp.waitForTimeout(1000);
    const ib = await body(rp);
    ok(ib.includes('0 of 4 confirmed'), 'rep: introduction recorded, 0 of 4 confirmed');
    await noScroll(rp, 'rep intro');

    /* ---------------------------------------------------------------- 3. leader: queue → person → confirm all */
    const lp = await newPage(browser, 'desktop'); pages.push(lp);
    await signIn(lp, 'leader@rally.test');
    await waitScreen(lp, 'lead-queue');
    await lp.waitForSelector(`[data-a="lead-open-person"][data-id="${marcus.person_id}"]`, { timeout: 10000 });
    const q = await body(lp);
    ok(/1 new introduction/i.test(q), 'leader queue header counts the new introduction');
    await shot(lp, '05-leader-queue');
    await noScroll(lp, 'leader queue (desktop)');
    await lp.click(`[data-a="lead-open-person"][data-id="${marcus.person_id}"] >> nth=0`);
    await waitScreen(lp, 'lead-person');
    await lp.waitForSelector('[data-a="lead-intro-ok"]');
    await lp.click('[data-a="lead-intro-ok"]'); await lp.waitForTimeout(1000);
    ok((await body(lp)).includes('Changing the stage does not tick a requirement.'), 'the stage card reminds: changing the stage does not tick a requirement');
    for (const k of [1, 2, 3, 4]) {
      await lp.waitForSelector(`[data-a="lead-req"][data-req="${k}"][data-on="1"]`);
      await lp.click(`[data-a="lead-req"][data-req="${k}"][data-on="1"]`);
      await lp.waitForSelector('form[data-form="lead-req"]');
      if (k === 4) {
        await lp.fill('#lwRqS', '2027-05-04');
        await lp.check('form[data-form="lead-req"] input[name="na"]');
        await shot(lp, '06-leader-r4-sheet');
      }
      await lp.click('form[data-form="lead-req"] button[type="submit"]');
      await lp.waitForSelector('form[data-form="lead-req"]', { state: 'detached', timeout: 8000 });
      await lp.waitForTimeout(700);
    }
    const t4 = (await toastsSeen(lp)).join(' | ');
    const pb = await body(lp);
    ok(/ready for review/i.test(pb + t4), 'all four confirmed: referral reward ready for review (' + t4.slice(0, 120) + ')');
    await shot(lp, '07-leader-person-4of4');
    /* approve the referral from the person page */
    await lp.click('[data-a="lead-approve"] >> nth=0');
    await lp.waitForSelector('form[data-form="lead-approve"]');
    await lp.click('form[data-form="lead-approve"] button[type="submit"]');
    await lp.waitForTimeout(800); await dismissOverlays(lp);
    let rs = await rpc(repTok, 'rep_state', {});
    const refRow = (rs.referrals || [])[0] || {};
    ok(refRow.status === 'approved', 'leader approved the referral in the UI (server status approved)');

    /* ---------------------------------------------------------------- 4. leader: walkthrough, spot-check, approve list */
    await goScreen(lp, 'lead-reps');
    const repId = st.rep ? st.rep.id : (await rpc(repTok, 'whoami', {})).user.id;
    await lp.click(`[data-a="lead-open-rep"][data-id="${repId}"] >> nth=0`);
    await waitScreen(lp, 'lead-rep');
    await lp.waitForSelector('[data-a="lead-sc-pick"][data-v="looks_real"]', { timeout: 10000 });
    const picks = await lp.$$('[data-a="lead-sc-pick"][data-v="looks_real"]');
    for (let i = 0; i < picks.length; i++) { await lp.click(`[data-a="lead-sc-pick"][data-v="looks_real"] >> nth=${i}`); await lp.waitForTimeout(100); }
    ok(picks.length >= 3 && picks.length <= 5, `spot-check sample has 3 to 5 contacts (${picks.length})`);
    await shot(lp, '08-leader-spotcheck');
    await lp.click('[data-a="lead-sc-save"]'); await lp.waitForTimeout(1200);
    await lp.click('[data-a="lead-approve"][data-kind="list"], [data-a="lead-approve"] >> nth=0');
    await lp.waitForSelector('form[data-form="lead-approve"]');
    await lp.click('form[data-form="lead-approve"] button[type="submit"]');
    await lp.waitForTimeout(900); await dismissOverlays(lp);
    rs = await rpc(repTok, 'rep_state', {});
    ok(rs.list_reward && rs.list_reward.status === 'approved', 'leader spot-checked and approved the list reward in the UI');
    await noScroll(lp, 'leader walkthrough (desktop)');

    /* ---------------------------------------------------------------- 5. rep sees Pending pay */
    await goScreen(rp, 'rewards'); await rp.waitForTimeout(400); await dismissOverlays(rp);
    let rb = await body(rp);
    ok(rb.includes('List reward: $100 · Pending pay.') && rb.includes('Referral reward $100 · Pending pay.'), 'rep sees both as Pending pay');
    ok(!!(await rp.$('main img[src*="panther"]')), 'the panther stamp shows on Pending pay');
    await shot(rp, '09-rep-pending-pay');

    /* ---------------------------------------------------------------- 6. owner: incentive with a picture, award, pay */
    const op = await newPage(browser, 'desktop'); pages.push(op);
    await signIn(op, 'owner@rally.test');
    await waitScreen(op, 'own-dash');
    await shot(op, '10-owner-dash');
    await noScroll(op, 'owner dashboard (desktop)');
    await goScreen(op, 'own-incentives');
    await op.click('[data-a="own-inc-edit"][data-id="new"]'); await op.waitForTimeout(500);
    await op.fill('#oiN', 'November Sprint King');
    await op.setInputFiles('#oiFile', require('path').join(__dirname, '..', '..', 'img', 'panther-384.jpg'));
    await op.waitForSelector('#oiThumbs img', { timeout: 10000 });
    await op.fill('#oiP', '50'); await op.fill('#oiH', 'Most complete contacts in November.');
    await shot(op, '11-owner-incentive-editor');
    await op.click('[data-a="own-inc-save"][data-s="published"]'); await op.waitForTimeout(1200);
    const incs = (await rpc(ownTok, 'owner_state', {})).incentives || [];
    const inc = incs.find((i) => i.name === 'November Sprint King');
    ok(inc && inc.status === 'published' && inc.prize_cents === 5000 && inc.pictures.length === 1 && inc.pictures[0].length <= 400000, 'owner published the incentive with a resized picture under 400,000 characters');
    await op.click(`[data-a="own-inc-award"][data-id="${inc.id}"]`);
    await op.waitForSelector('form[data-form="own-inc-award"], form[data-form="lead-award"]');
    const awardForm = (await op.$('form[data-form="own-inc-award"]')) ? 'own-inc-award' : 'lead-award';
    const sel = await op.$(`form[data-form="${awardForm}"] select`);
    if (sel) await sel.selectOption(repId);
    await op.fill(`form[data-form="${awardForm}"] textarea`, 'Top of the board');
    await op.click(`form[data-form="${awardForm}"] button[type="submit"]`); await op.waitForTimeout(1000); await dismissOverlays(op);
    rs = await rpc(repTok, 'rep_state', {});
    ok((rs.awards || []).some((a) => a.status === 'approved'), 'owner awarded the incentive to rep3 (approved award)');

    await goScreen(op, 'own-rewards'); await op.waitForTimeout(600);
    await shot(op, '12-owner-rewards');
    for (let i = 0; i < 3; i++) {
      const b = await op.$('[data-a="own-pay"]'); if (!b) break;
      await b.click(); await op.waitForSelector('form[data-form="own-pay"]');
      await op.fill('#opM', 'Venmo test ' + (i + 1));
      await op.click('form[data-form="own-pay"] button[type="submit"]');
      await op.waitForSelector('form[data-form="own-pay"]', { state: 'detached', timeout: 8000 }); await op.waitForTimeout(800);
    }
    rs = await rpc(repTok, 'rep_state', {});
    ok(rs.list_reward.status === 'paid' && rs.referrals[0].status === 'paid' && rs.awards.every((a) => a.status === 'paid'), 'owner marked pay issued on all three in the UI');
    const orw = await rpc(ownTok, 'owner_rewards', { p_status: 'paid' });
    const orows = Array.isArray(orw) ? orw : (orw.rows || orw.rewards || []);
    const paidList = orows.find((r) => r.kind === 'list');
    let again = null; try { await rpc(ownTok, 'mark_pay_issued', { p_reward: paidList && (paidList.id || paidList.reward_id), p_paid_on: null, p_method: 'again' }); } catch (e) { again = e.data && e.data.message; }
    ok(/already_paid/.test(again || ''), 'a second pay mark is refused: already_paid');

    /* ---------------------------------------------------------------- 7. rep sees Pay issued */
    await goScreen(rp, 'rewards'); await rp.waitForTimeout(400); await dismissOverlays(rp);
    rb = await body(rp);
    ok(/List reward: \$100\. Pay issued [A-Z][a-z]{2} \d+\./.test(rb) && /Marcus Lee: \$100\. Pay issued/.test(rb), 'rep sees Pay issued with the date for the list and the referral');
    ok(rb.includes('November Sprint King') && /Pay issued: \$250/.test(rb), 'rep sees the incentive, and Pay issued totals $250');
    await noScroll(rp, 'rep rewards, paid');
    await shot(rp, '13-rep-pay-issued');

    /* ---------------------------------------------------------------- 8. a rep who leaves: closed quietly */
    const r2 = await token('rep2@rally.test');
    await rpc(r2, 'accept_ack', { p_version: 1 });
    for (let i = 0; i < 100; i++) await rpc(r2, 'save_entry', { p: { ...seedEntry(1000 + i), handle: 'leaver.' + i } });
    await goScreen(op, 'own-rewards'); await op.waitForTimeout(700);
    const r2id = (await rpc(r2, 'whoami', {})).user.id;
    const closeBtn = await op.$(`[data-a="own-close-unpaid"][data-rep="${r2id}"]`);
    ok(!!closeBtn, 'owner sees "Close unpaid rewards" for a rep with an unpaid reward');
    if (closeBtn) {
      await closeBtn.click(); await op.waitForSelector('form[data-form="own-close-unpaid"]');
      await shot(op, '14-owner-close-unpaid');
      const radio = await op.$('form[data-form="own-close-unpaid"] input[value="left"]'); if (radio) await radio.check();
      await op.click('form[data-form="own-close-unpaid"] button[type="submit"]'); await op.waitForTimeout(1000);
    }
    const r2s = await rpc(r2, 'rep_state', {});
    const r2json = JSON.stringify(r2s);
    ok(r2s.list_reward && r2s.list_reward.reversed === true, 'the leaving rep\'s unpaid list reward is reversed');
    ok(!/\bleft\b|no_show|no-show|didn.t come out|rep left/i.test(r2json), 'nothing in the leaving rep\'s data says why');
    /* the leader cannot approve a closed rep's reward; the owner can reopen */
    const ts2 = await rpc(leadTok, 'team_state', {});
    const r2row = (ts2.reps || []).find((r) => r.id === r2id);
    ok(r2row && r2row.closed === true, 'the leader sees the leaving rep as closed');
    let refused = null;
    try { await rpc(leadTok, 'award_incentive', { p_incentive: inc.id, p_rep: r2id, p_note: 'test', p_request: crypto.randomUUID() }); } catch (e) { refused = e.data && e.data.message; }
    ok(/rep_closed/.test(refused || ''), 'an award to a closed rep is refused: rep_closed');
    await goScreen(op, 'own-rewards'); await op.waitForTimeout(700);
    const reopenBtn = await op.$(`[data-a="own-reopen"][data-rep="${r2id}"]`);
    ok(!!reopenBtn, 'owner sees Reopen for the closed rep');
    if (reopenBtn) {
      await reopenBtn.click(); await op.waitForSelector('form[data-form="own-reopen"]');
      await op.click('form[data-form="own-reopen"] button[type="submit"]'); await op.waitForTimeout(900);
      const ts3 = await rpc(leadTok, 'team_state', {});
      ok(!((ts3.reps || []).find((r) => r.id === r2id) || {}).closed, 'after Reopen the rep is no longer closed');
    }
    /* an award retried with the same request id pays once */
    const reqId = crypto.randomUUID();
    const a1 = await rpc(ownTok, 'award_incentive', { p_incentive: inc.id, p_rep: r2id, p_note: 'weekly', p_request: reqId });
    const a2 = await rpc(ownTok, 'award_incentive', { p_incentive: inc.id, p_rep: r2id, p_note: 'weekly', p_request: reqId });
    const aw = ((await rpc(r2, 'rep_state', {})).awards || []).filter((a) => a.status === 'approved');
    ok(aw.length === 1, 'an award retried with the same request id exists once (' + aw.length + ')');

    /* ---------------------------------------------------------------- 9. new sign-up → placed by the owner */
    const np = await newPage(browser, 'phone'); pages.push(np);
    const email = 'newrep' + Date.now() + '@rally.test';
    await np.goto(BASE + '/'); await np.waitForSelector('#siEmail');
    await np.click('[data-a="go-signup"]');
    await np.fill('#suName', 'Jamie Newrep'); await np.fill('#suEmail', email); await np.fill('#suPass', 'rally100dev');
    await np.click('#suBtn');
    await waitScreen(np, 'noteam');
    ok((await text(np)).includes('Almost there'), 'a new sign-up lands on "Almost there" (no team)');
    await shot(np, '15-new-signup-noteam');
    await goScreen(op, 'own-dash'); await op.waitForTimeout(800);
    const db = await body(op);
    ok(db.includes(email), 'owner dashboard lists the new sign-up');
    const line = await op.evaluate((em) => { const c = Array.from(document.querySelectorAll('code.lw-sql')).find((x) => x.textContent.includes(em)); return c && c.textContent; }, email);
    const teamId = PSQL("select team_id from public.profiles where email = 'owner@rally.test'");
    ok(line === `update public.profiles set team_id = '${teamId}' where email = '${email}';`, 'the copy line is exactly the one-line team placement');
    PSQL(line);
    await np.click('[data-a="recheck"]');
    await np.waitForSelector('main.ob', { timeout: 10000 });
    ok(true, 'after placement, "Check again" opens onboarding');

    /* ---------------------------------------------------------------- 10. phone widths for leader and owner */
    const lpp = await newPage(browser, 'phone'); pages.push(lpp);
    await signIn(lpp, 'owner@rally.test'); await waitScreen(lpp, 'own-dash');
    for (const s of ['own-dash', 'own-contacts', 'own-rewards', 'own-incentives', 'lead-queue', 'lead-reps']) {
      await goScreen(lpp, s); await lpp.waitForTimeout(500); await noScroll(lpp, 'owner on a phone: ' + s);
    }
    await shot(lpp, '16-owner-phone-reps');
    const sp = await newPage(browser, 'small'); pages.push(sp);
    await signIn(sp, REP); await waitScreen(sp, 'home');
    for (const s of ['home', 'scenes', 'network', 'intros', 'rewards']) { await goScreen(sp, s); await sp.waitForTimeout(400); await noScroll(sp, 'rep at 320px: ' + s); }
    await shot(sp, '17-rep-320-rewards');

    for (const p of pages) ok(p._errors.length === 0, 'zero console errors on a page' + (p._errors.length ? ': ' + p._errors.slice(0, 3).join(' | ') : ''));
  } catch (e) {
    ok(false, 'exception: ' + e.message.split('\n')[0]);
    for (let i = 0; i < pages.length; i++) { try { await shot(pages[i], 'zz-exception-' + i); } catch (x) {} }
  }
  await browser.close();
  process.exit(L.summary() ? 1 : 0);
})();
