/* RALLY 100: Owner Dashboard. Screens: own-dash (totals, rewards by status, people by stage, payments,
   leader workload, new sign-ups), own-contacts (every Person: search, filters, CSV export), own-rewards (the
   reward ledger with approve, pay issued, reverse, correct credit and closing a leaving rep's unpaid
   rewards) and own-incentives (add, edit, publish, turn off). The owner-only actions here (own-*) also
   appear on the leader screens in lead.js. Builds on R100.lw (lead.js loads first).
   The leaving-rep rule is internal: it is worded for the owner only and never reaches a rep screen. */
(function () {
  'use strict';
  var R = window.R100, esc = R.esc, LW = R.lw, arr = LW.arr, kv = LW.kv;

  function asList(x) { return Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]); }
  function fmtN(n) { return (Number(n) || 0).toLocaleString('en-US'); }
  function ymdOf(v) {
    if (!v) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var d = new Date(v);
    return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function sqlQuote(s) { return String(s == null ? '' : s).replace(/'/g, "''"); }
  function sqlFor(email) { return "update public.profiles set team_id = '" + sqlQuote(LW.me().team_id) + "' where email = '" + sqlQuote(email) + "';"; }
  function loadOwner() {
    return R.load('owner').then(function (d) {
      var rw = (d && d.rewards) || {}, n = (rw.ready && rw.ready.count) || 0;
      R.navBadges['own-rewards'] = n > 99 ? '99+' : n;
      return d;
    });
  }
  LW.loadOwner = loadOwner;
  R.actions['own-go-rewards'] = function (el) { LW.cache().f.rw = el.dataset.s; R.go('own-rewards', { status: el.dataset.s }); };
  R.actions['own-open'] = function (el) { R.closeSheet(); R.go(el.dataset.k === 'rep' ? 'lead-rep' : 'lead-person', { id: el.dataset.id, from: R.view.name, fromP: R.view.p }); };

  /* ======================================================================================================
     DASHBOARD
     ====================================================================================================== */
  var RSTAT = ['ready', 'needs_correction', 'approved', 'paid', 'in_progress'];
  function rewardsCard(d) {
    var rw = d.rewards || {};
    var rows = RSTAT.map(function (s) {
      var x = rw[s] || {}, amt;
      amt = s === 'approved' || s === 'paid' ? '<b>' + esc(R.money(x.amount_cents)) + '</b>' : '<span class="dim">No amount until approved</span>';
      return '<button class="lw-rrow" data-a="own-go-rewards" data-s="' + s + '"><span>' + esc(R.STATUS_LABEL[s]) + '</span><span class="n">' + fmtN(x.count) + '</span><span class="amt">' + amt + '</span></button>';
    }).join('');
    var ap = rw.approved || {}, pd = rw.paid || {};
    return '<section class="card"><div class="between"><h2>Rewards</h2><button class="btn xs" data-a="own-go-rewards" data-s="all">View all</button></div><div class="lw-rrows">' + rows + '</div>' +
      '<p class="small muted">' + esc('Pending pay: ' + R.money(ap.amount_cents) + ' · Pay issued: ' + R.money(pd.amount_cents)) + '. Reversed rewards are not counted.</p></section>';
  }
  function funnelCard(d) {
    var f = d.funnel || {}, o = d.outcomes || {};
    var max = Math.max.apply(null, R.STAGES.map(function (s) { return Number(f[s]) || 0; }).concat([1]));
    var rows = R.STAGES.map(function (s) {
      var n = Number(f[s]) || 0, pct = n ? Math.max(1, Math.round(n / max * 100)) : 0;
      return '<div class="lw-fr" role="listitem"><span class="lb">' + esc(R.STAGE_LABEL[s]) + '</span><span class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="n">' + fmtN(n) + '</span></div>';
    }).join('');
    var outs = ['follow_up', 'not_interested', 'do_not_contact'].map(function (k) { return '<span class="chip">' + esc(R.OUTCOME_LABEL[k]) + ' ' + fmtN(o[k]) + '</span>'; }).join('');
    return '<section class="card"><h2>People by stage</h2><div class="lw-funnel" role="list">' + rows + '</div><div class="caps">Outcomes</div><div class="chips">' + outs + '</div></section>';
  }
  function signupsCard(d) {
    var su = arr(d.pending_signups); if (!su.length) return '';
    return '<section class="card"><div class="between"><h2>New sign-ups waiting for a team</h2><span class="chip alert">' + su.length + '</span></div>' +
      '<p class="small muted">Paste this in Supabase, SQL editor, to add them to your team.</p>' + su.map(function (s) {
        var sub = [s.name ? s.email : '', s.created_at ? 'signed up ' + R.date(s.created_at) : ''].filter(Boolean).join(' · ');
        return '<div class="lw-su"><div class="between"><div class="grow"><b>' + esc(s.name || s.email || 'New sign-up') + '</b>' + (sub ? '<div class="small muted">' + esc(sub) + '</div>' : '') + '</div>' +
          '<button class="btn xs" data-a="own-copy-sql" data-email="' + esc(s.email || '') + '">Copy</button></div><code class="lw-sql">' + esc(sqlFor(s.email)) + '</code></div>';
      }).join('') + '</section>';
  }
  R.actions['own-copy-sql'] = function (el) { R.copy(sqlFor(el.dataset.email)); };
  function leadersCard(d) {
    var L = arr(d.leaders);
    return '<section class="card"><h2>Leader workload</h2>' + (L.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Leader</th><th>Team</th><th>Open items</th></tr></thead><tbody>' + L.map(function (l) {
      return '<tr><td>' + esc(l.name || '') + '</td><td>' + esc(l.team_name || '') + '</td><td>' + fmtN(l.open_items) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="empty">No leaders yet.</p>') + '</section>';
  }
  function rewardWhat(r) {
    var n = r.kind === 'referral' ? r.person_name : r.kind === 'incentive' ? (r.incentive_name || r.name) : '';
    return LW.kind(r.kind) + (n ? ': ' + n : '');
  }
  function paymentsCard(d) {
    var P = arr(d.payments);
    return '<section class="card"><div class="between"><h2>Recent payments</h2>' + (P.length ? '<button class="btn xs" data-a="own-go-rewards" data-s="paid">View all</button>' : '') + '</div>' +
      (P.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pay issued</th><th>Rep</th><th>Reward</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded by</th></tr></thead><tbody>' + P.slice(0, 10).map(function (r) {
        return '<tr><td class="nowrap">' + esc(R.date(r.paid_on)) + '</td><td>' + esc(r.rep_name || '') + '</td><td>' + esc(rewardWhat(r)) + '</td><td class="nowrap">' + esc(LW.amt(r)) + '</td>' +
          '<td class="lw-wrap">' + esc(r.paid_method || '') + '</td><td class="lw-wrap">' + esc(r.paid_reference || '') + '</td><td>' + esc(r.paid_by_name || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="empty">No payments recorded yet.</p>') +
      '<p class="small dim">' + esc("'Pay issued' means RALLY has logged the payment; it is not the transfer itself.") + '</p></section>';
  }
  function renderDash() {
    var d = R.data.owner, head = '<div class="between"><h1>Dashboard</h1><span class="small dim">All teams</span></div>';
    if (!d) return LW.wait(head);
    var t = d.totals || {};
    var tiles = [['Reps', t.reps], ['People', t.persons], ['Counted contacts', t.counted], ['Introductions', t.introductions], ['Signed', t.signed]];
    return LW.shell(head + LW.stale() + '<div class="stats lw-tiles">' + tiles.map(function (x) { return '<div class="stat"><b>' + esc(fmtN(x[1])) + '</b><span>' + esc(x[0]) + '</span></div>'; }).join('') + '</div>' +
      signupsCard(d) + '<div class="cols two"><div class="stack lw-col">' + rewardsCard(d) + leadersCard(d) + '</div><div class="stack lw-col">' + funnelCard(d) + '</div></div>' + paymentsCard(d));
  }
  R.screens['own-dash'] = { mode: 'owner', wide: true, nav: 'owner', load: loadOwner, render: renderDash, after: function () { LW.visit(); } };

  /* ======================================================================================================
     CONTACTS
     ====================================================================================================== */
  var CMAX = 300;
  function loadContacts() { return R.cloud.rpc('owner_contacts', {}).then(function (d) { LW.cache().contacts = arr(d && d.rows); }); }
  function cf() { var f = LW.cache().f; return f.c || (f.c = { q: '', stage: '', outcome: '', interest: '', rep: '' }); }
  function handlesText(h) { return asList(h).map(LW.handleText).filter(Boolean); }
  function contactMatch(r, f) {
    if (f.stage && r.stage !== f.stage) return false;
    if (f.outcome && (f.outcome === 'none' ? !!r.outcome : r.outcome !== f.outcome)) return false;
    if (f.interest && (r.interest || 'unknown') !== f.interest) return false;
    if (f.rep && asList(r.reps).indexOf(f.rep) < 0) return false;
    var q = String(f.q || '').trim().toLowerCase();
    if (!q) return true;
    var bare = q.replace(/^@/, ''), digits = q.replace(/\D/g, '');
    if (String(r.name || '').toLowerCase().indexOf(q) >= 0) return true;
    if (handlesText(r.handles).concat(asList(r.handles).map(String)).join(' ').toLowerCase().indexOf(bare) >= 0) return true;
    return digits.length >= 3 && String(r.phone || '').indexOf(digits) >= 0;
  }
  function contactRows(rows) {
    if (!rows.length) return '<tr><td colspan="11" class="muted">No contacts match.</td></tr>';
    return rows.slice(0, CMAX).map(function (r) {
      return '<tr class="tap" data-a="lead-open-person" data-id="' + esc(r.person_id) + '"><td><button class="link" data-a="lead-open-person" data-id="' + esc(r.person_id) + '">' + esc(r.name || 'Unnamed') + '</button></td>' +
        '<td class="nowrap">' + esc(R.fmtPhone(r.phone) || '—') + '</td><td>' + handlesText(r.handles).map(esc).join('<br>') + '</td><td>' + esc(asList(r.reps).join(', ')) + '</td><td>' + esc(asList(r.team_names).join(', ')) + '</td>' +
        '<td>' + esc(R.STAGE_LABEL[r.stage] || r.stage || '') + '</td><td>' + esc(R.OUTCOME_LABEL[r.outcome] || '') + '</td><td>' + esc(R.INTEREST_LABEL[r.interest] || 'Unknown') + '</td>' +
        '<td class="nowrap">' + (Number(r.requirements_confirmed) || 0) + ' of 4</td><td>' + esc(r.reward_status ? (R.STATUS_LABEL[r.reward_status] || r.reward_status) : '') + '</td><td class="nowrap">' + esc(R.date(r.created_at)) + '</td></tr>';
    }).join('');
  }
  function countLine(n, total) {
    return (n === total ? R.plural(total, 'person', 'people') : n + ' of ' + R.plural(total, 'person', 'people')) +
      (n > CMAX ? '. Showing the first ' + CMAX + '; narrow the search to see the rest. Export CSV has them all.' : '');
  }
  function renderContacts() {
    var rows = LW.cache().contacts, head = '<div class="between"><h1>Contacts</h1></div>';
    if (!rows) return LW.wait(head);
    var f = cf(), reps = {};
    rows.forEach(function (r) { asList(r.reps).forEach(function (n) { reps[n] = 1; }); });
    function opt(v, t, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; }
    function sel(k, label, opts) { return '<div class="field"><label for="lwF' + k + '">' + label + '</label><select id="lwF' + k + '" data-f="' + k + '">' + opts + '</select></div>'; }
    var stage = opt('', 'Any stage', f.stage) + R.STAGES.map(function (s) { return opt(s, R.STAGE_LABEL[s], f.stage); }).join('');
    var outcome = opt('', 'Any outcome', f.outcome) + opt('none', 'No outcome', f.outcome) + Object.keys(R.OUTCOME_LABEL).map(function (k) { return opt(k, R.OUTCOME_LABEL[k], f.outcome); }).join('');
    var interest = opt('', 'Any interest', f.interest) + Object.keys(R.INTEREST_LABEL).map(function (k) { return opt(k, R.INTEREST_LABEL[k], f.interest); }).join('');
    var rep = opt('', 'Any rep', f.rep) + Object.keys(reps).sort().map(function (n) { return opt(n, n, f.rep); }).join('');
    var shown = rows.filter(function (r) { return contactMatch(r, f); });
    return LW.shell(head + LW.stale() +
      '<div class="lw-filters"><div class="field lw-fq"><label for="lwCq">Search</label><input class="search" id="lwCq" type="search" placeholder="Name, phone or handle" value="' + esc(f.q) + '"></div>' +
      sel('stage', 'Stage', stage) + sel('outcome', 'Outcome', outcome) + sel('interest', 'Interest', interest) + sel('rep', 'Rep', rep) + '</div>' +
      '<div class="between"><p class="muted small" id="lwCcount" aria-live="polite">' + esc(countLine(shown.length, rows.length)) + '</p><button class="btn xs" data-a="own-csv">Export CSV</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Social</th><th>Reps</th><th>Team</th><th>Stage</th><th>Outcome</th><th>Interest</th><th>Requirements</th><th>Reward</th><th>Added</th></tr></thead>' +
      '<tbody id="lwCrows">' + contactRows(shown) + '</tbody></table></div>');
  }
  function bindContacts() {
    var f = cf(), q = document.getElementById('lwCq');
    function upd() {
      var rows = LW.cache().contacts || [], shown = rows.filter(function (r) { return contactMatch(r, f); });
      var tb = document.getElementById('lwCrows'), c = document.getElementById('lwCcount');
      if (tb) tb.innerHTML = contactRows(shown);
      if (c) c.textContent = countLine(shown.length, rows.length);
    }
    if (q) q.addEventListener('input', function () { f.q = q.value; upd(); });
    Array.prototype.forEach.call(document.querySelectorAll('#app select[data-f]'), function (s) { s.addEventListener('change', function () { f[s.dataset.f] = s.value; upd(); }); });
  }
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;                       /* keep spreadsheet apps from running a cell as a formula */
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  R.actions['own-csv'] = function () {
    var f = cf(), rows = (LW.cache().contacts || []).filter(function (r) { return contactMatch(r, f); });
    var head = ['person_id', 'name', 'phone', 'handles', 'reps', 'team_names', 'stage', 'outcome', 'interest', 'requirements_confirmed', 'reward_status', 'created_at'];
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [r.person_id, r.name, R.fmtPhone(r.phone || ''), handlesText(r.handles).join('; '), asList(r.reps).join('; '), asList(r.team_names).join('; '),
        R.STAGE_LABEL[r.stage] || r.stage || '', R.OUTCOME_LABEL[r.outcome] || '', R.INTEREST_LABEL[r.interest] || 'Unknown', Number(r.requirements_confirmed) || 0,
        r.reward_status ? (R.STATUS_LABEL[r.reward_status] || r.reward_status) : '', ymdOf(r.created_at)].map(csvCell).join(',');
    }));
    R.download('rally100-contacts-' + R.today() + '.csv', '﻿' + lines.join('\r\n') + '\r\n');
    R.toast('Exported ' + R.plural(rows.length, 'contact'));
  };
  R.screens['own-contacts'] = { mode: 'owner', wide: true, nav: 'owner', load: loadContacts, render: renderContacts, after: function () { LW.visit(); bindContacts(); } };

  /* ======================================================================================================
     REWARDS
     ====================================================================================================== */
  var RF = [['all', 'All'], ['ready', 'Ready for review'], ['needs_correction', 'Needs correction'], ['approved', 'Pending pay'], ['paid', 'Pay issued'], ['in_progress', 'In progress']];
  function rwStatus(p) { var s = (p && p.status) || LW.cache().f.rw || 'all'; return RF.some(function (x) { return x[0] === s; }) ? s : 'all'; }
  function loadRewards(p) {
    var s = rwStatus(p);
    return Promise.all([R.cloud.rpc('owner_rewards', { p_status: s === 'all' ? null : s }).then(function (d) { LW.cache().rewards[s] = arr(d && d.rows); }), loadOwner()]);
  }
  function findReward(id) {
    var C = LW.cache(), keys = Object.keys(C.rewards);
    for (var i = 0; i < keys.length; i++) { var x = arr(C.rewards[keys[i]]).filter(function (r) { return LW.rid(r) === id; })[0]; if (x) return x; }
    return null;
  }
  /* Money shows only once a reward is approved (Pending pay) or paid (Pay issued). */
  function amountCell(r) {
    if (r.status !== 'approved' && r.status !== 'paid') return '<span class="dim">—</span>';
    var a = LW.amt(r); if (!a) return '';
    return LW.reversed(r) ? '<span class="dim">' + esc(a) + '</span>' : '<b>' + esc(a) + '</b>';
  }
  function datesCell(r) {
    var out = [];
    if (r.paid_on) out.push('Paid ' + R.date(r.paid_on) + (r.paid_method ? ' · ' + r.paid_method : ''));
    else if (r.approved_at) out.push('Approved ' + R.date(r.approved_at) + (r.approved_by_name ? ' by ' + r.approved_by_name : ''));
    else if (r.created_at) out.push('Opened ' + R.date(r.created_at));
    if (r.reversed_at) out.push('Reversed ' + R.date(r.reversed_at));
    return out.map(esc).join('<br>');
  }
  function rowActions(r) {
    var rev = LW.reversed(r), at = LW.rattrs(r), b = '', closed = LW.repClosed(r);
    if (!rev && !closed && r.status === 'ready') b += '<button class="btn xs win" data-a="lead-approve"' + at + '>Approve</button>';
    if (!rev && !closed && r.status === 'approved') b += '<button class="btn xs" data-a="own-pay"' + at + '>Mark pay issued</button>';
    return '<div class="lw-btns lw-nowrap">' + b + '<button class="btn xs" data-a="own-reward" data-id="' + esc(LW.rid(r)) + '">More</button></div>';
  }
  function unpaidByRep(rows, s) {
    if (s !== 'all') return '';
    var by = {}, order = [];
    function add(id, name) { if (!by[id]) { by[id] = { name: name || 'Rep', n: 0, closed: false }; order.push(id); } return by[id]; }
    rows.forEach(function (r) { if (r.rep_id && !LW.reversed(r) && r.status !== 'paid') add(r.rep_id, r.rep_name).n++; });
    arr(R.data.owner && R.data.owner.reps).forEach(function (r) { if (r.closed) add(r.id, r.name).closed = true; });
    if (!order.length) return '';
    return '<section class="card"><h2>Unpaid rewards by rep</h2><p class="small muted">If a rep left or didn’t come out, close their unpaid rewards as not paid. Pay already issued stays. While a rep is closed nothing new is approved, awarded or paid for them. Internal only: the rep is shown no reason.</p>' +
      '<div class="tbl-wrap lw-stackwrap"><table class="tbl lw-stack"><thead><tr><th>Rep</th><th>Unpaid</th><th></th></tr></thead><tbody>' + order.map(function (id) {
        var x = by[id];
        return '<tr><td><button class="link" data-a="lead-open-rep" data-id="' + esc(id) + '">' + esc(x.name) + '</button>' + (x.closed ? ' <span class="chip">Closed</span>' : '') + '</td><td data-label="Unpaid">' + x.n + '</td>' +
          '<td><div class="lw-btns"><button class="btn xs danger" data-a="own-close-unpaid" data-rep="' + esc(id) + '" data-name="' + esc(x.name) + '">Close unpaid rewards (rep left or didn’t come out)</button>' +
          (x.closed ? '<button class="btn xs" data-a="own-reopen" data-rep="' + esc(id) + '" data-name="' + esc(x.name) + '">Reopen</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }
  function renderRewards(p) {
    var s = rwStatus(p), rows = LW.cache().rewards[s];
    var chips = RF.map(function (x) { return '<button class="cbtn' + (x[0] === s ? ' on' : '') + '" aria-pressed="' + (x[0] === s) + '" data-a="own-go-rewards" data-s="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('');
    var head = '<div class="between"><h1>Rewards</h1></div><div class="chips" role="group" aria-label="Status">' + chips + '</div>';
    if (!rows) return LW.wait(head);
    var body = rows.length ? '<div class="tbl-wrap lw-stackwrap"><table class="tbl lw-stack"><thead><tr><th>Reward</th><th>Rep</th><th>Status</th><th>Amount</th><th>Dates</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
      var flags = arr(r.flags).indexOf('no_intro') >= 0 ? '<div><span class="chip alert">No introduction recorded</span></div>' : '';
      return '<tr><td><b>' + esc(LW.subject(r)) + '</b><div class="small muted">' + esc(LW.kind(r.kind)) + '</div>' + flags + '</td>' +
        '<td data-label="Rep">' + (r.rep_id ? '<button class="link" data-a="lead-open-rep" data-id="' + esc(r.rep_id) + '">' + esc(r.rep_name || 'Rep') + '</button>' : '<span class="muted">' + esc(r.rep_name || 'Not credited yet') + '</span>') + '</td>' +
        '<td><span class="chips">' + LW.statusChips(r) + '</span></td><td class="nowrap" data-label="Amount">' + amountCell(r) + '</td><td class="small">' + datesCell(r) + '</td><td>' + rowActions(r) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="empty">No rewards here.</p>';
    return LW.shell(head + LW.stale() + '<p class="small dim">' + esc("'Pay issued' means RALLY has logged the payment; it is not the transfer itself.") + ' Amounts show once a reward is approved.</p>' + body + unpaidByRep(rows, s));
  }
  R.screens['own-rewards'] = { mode: 'owner', wide: true, nav: 'owner', load: loadRewards, render: renderRewards, after: function () { LW.visit(); } };

  /* Reward record detail, with every action its status allows. */
  R.actions['own-reward'] = function (el) {
    var r = findReward(el.dataset.id); if (!r) return;
    var rev = LW.reversed(r), at = LW.rattrs(r), h = '';
    h += kv('Type', esc(LW.kind(r.kind)));
    if (r.kind === 'referral') h += kv('Person', esc(r.person_name || ''));
    if (r.kind === 'incentive') h += kv('Incentive', esc(r.incentive_name || r.name || ''));
    h += kv('Credited rep', r.rep_name ? esc(r.rep_name) : '<span class="muted">Not credited yet</span>');
    if (r.team_name) h += kv('Team', esc(r.team_name));
    h += kv('Status', '<span class="chips">' + LW.statusChips(r) + '</span>');
    if ((r.status === 'approved' || r.status === 'paid') && LW.amt(r)) h += kv('Amount', esc(LW.amt(r) + (r.currency && r.currency !== 'USD' ? ' ' + r.currency : '')));
    if (r.created_at) h += kv('Opened', esc(R.dateLong(r.created_at)));
    if (r.kind === 'list') {
      var sc = r.spot_check;
      if (sc && sc.at) h += kv('Spot-check', esc('done by ' + (sc.by_name || 'a leader') + ', ' + R.date(sc.at) + (sc.note ? ': ' + sc.note : '')));
      else if (r.spot_checked != null || r.spot_check_id !== undefined) h += kv('Spot-check', esc(r.spot_checked || r.spot_check_id ? 'done' : 'not done'));
      if (r.count != null) h += kv('List count', esc(r.count + '/100'));
    }
    if (r.approved_at) h += kv('Approved', esc(R.dateLong(r.approved_at) + (r.approved_by_name ? ' by ' + r.approved_by_name : '')));
    if (r.paid_on) h += kv('Pay issued', esc(R.dateLong(r.paid_on) + (r.paid_method ? ' · ' + r.paid_method : '') + (r.paid_reference ? ' · ' + r.paid_reference : '') + (r.paid_by_name ? ' · recorded by ' + r.paid_by_name : '')));
    if (r.correction_note) h += kv('Correction', '<span class="lw-msg">' + esc(r.correction_note) + '</span>');
    if (rev) h += kv('Reversed', esc((r.reversed_at ? R.dateLong(r.reversed_at) : 'Yes') + (r.reversed_by_name ? ' by ' + r.reversed_by_name : '')) +
      (r.reversed_reason ? '<div class="small lw-msg">Internal: ' + esc(r.reversed_reason) + '</div>' : '') + (r.rep_reason ? '<div class="small lw-msg">Rep sees: ' + esc(r.rep_reason) + '</div>' : ''));
    if (arr(r.flags).length) h += kv('Flags', esc(arr(r.flags).map(function (f) { return f === 'no_intro' ? 'No introduction recorded' : f; }).join(', ')));
    h += kv('Reward ID', '<span class="small dim">' + esc(LW.rid(r)) + '</span>');
    var b = '';
    var closed = LW.repClosed(r);
    if (closed && !rev) h += kv('Rep closed', esc('Nothing is approved or paid for ' + (r.rep_name || 'this rep') + ' until you reopen them.'));
    if (!rev && r.status === 'ready') b += (closed ? '' : '<button class="btn sm win" data-a="lead-approve"' + at + '>Approve</button>') + '<button class="btn sm" data-a="lead-correct"' + at + '>Needs correction</button>';
    if (!rev && r.status === 'needs_correction') b += '<button class="btn sm" data-a="lead-resolve"' + at + '>Correction resolved</button>';
    if (!rev && !closed && r.status === 'approved') b += '<button class="btn sm" data-a="own-pay"' + at + '>Mark pay issued</button>';
    if (closed && r.rep_id) b += '<button class="btn sm" data-a="own-reopen" data-rep="' + esc(r.rep_id) + '" data-name="' + esc(r.rep_name || '') + '">Reopen ' + esc(r.rep_name || 'rep') + '</button>';
    if (!rev && r.kind === 'referral' && ['in_progress', 'ready', 'needs_correction'].indexOf(r.status) >= 0) b += '<button class="btn sm" data-a="own-credit"' + at + '>Correct credit</button>';
    if (!rev) b += '<button class="btn sm danger" data-a="own-reverse"' + at + '>Reverse</button>';
    var links = (r.person_id ? '<button class="btn sm" data-a="own-open" data-k="person" data-id="' + esc(r.person_id) + '">Open person</button>' : '') +
      (r.rep_id ? '<button class="btn sm" data-a="own-open" data-k="rep" data-id="' + esc(r.rep_id) + '">Open rep</button>' : '');
    R.sheet('<h2>' + esc(LW.rlabel(r)) + '</h2><dl class="lw-kv">' + h + '</dl>' + (b ? '<div class="lw-btns">' + b + '</div>' : '') + (links ? '<div class="lw-btns">' + links + '</div>' : '') +
      '<button class="btn ghost" data-a="sheet-close">Close</button>');
  };

  /* ---- owner-only reward actions (also used on the leader screens) */
  R.actions['own-pay'] = function (el) {
    var ds = el.dataset, t = new Date();
    R.sheet('<form data-form="own-pay" data-id="' + esc(ds.id) + '" class="stack"><h2>Mark pay issued</h2><p>' + esc((ds.amount ? R.money(ds.amount) + ' · ' : '') + (ds.label || 'Reward')) + '</p>' +
      '<div class="field"><label for="opD">Paid on</label><input id="opD" name="date" type="date" value="' + R.today() + '"></div>' +
      '<div class="field"><label for="opM">How it was paid</label><input id="opM" name="method" maxlength="200" placeholder="Venmo ' + (t.getMonth() + 1) + '/' + t.getDate() + '" autofocus></div>' +
      '<div class="field"><label for="opR">Reference (optional)</label><input id="opR" name="ref" maxlength="200" placeholder="Check number or transaction ID"></div>' +
      '<p class="small muted">' + esc("'Pay issued' means RALLY has logged the payment; it is not the transfer itself.") + '</p>' + LW.sheetButtons('Mark pay issued', 'win') + '</form>');
  };
  R.forms['own-pay'] = async function (f) {
    var date = LW.val(f, 'date'), method = LW.val(f, 'method');
    if (!date) { LW.setErr(f, R.say('date_required')); return; }
    if (!method) { LW.setErr(f, R.say('method_required')); return; }
    var res = await R.call('mark_pay_issued', { p_reward: f.dataset.id, p_paid_on: date, p_method: method, p_reference: LW.val(f, 'ref') || null }, LW.submitBtn(f));
    if (res) LW.done('Pay issued ' + R.date(date), 'win');
  };
  R.actions['own-reverse'] = function (el) {
    var ds = el.dataset;
    R.sheet('<form data-form="own-reverse" data-id="' + esc(ds.id) + '" class="stack"><h2>Reverse this reward</h2><p class="muted">' + esc(ds.label || 'Reward') + '. The record and its history stay; it is flagged reversed and leaves the totals.</p>' +
      '<div class="field"><label for="orI">Internal reason</label><textarea id="orI" name="reason" maxlength="1000" autofocus></textarea><span class="small dim">Only the owner sees this.</span></div>' +
      '<div class="field"><label for="orR">Reason the rep sees (optional)</label><textarea id="orR" name="rep" maxlength="500"></textarea><span class="small dim">Leave it empty to show no reason.</span></div>' +
      LW.sheetButtons('Reverse', 'danger') + '</form>');
  };
  R.forms['own-reverse'] = async function (f) {
    var reason = LW.val(f, 'reason');
    if (!reason) { LW.setErr(f, R.say('reason_required')); return; }
    var res = await R.call('reverse_reward', { p_reward: f.dataset.id, p_reason: reason, p_rep_reason: LW.val(f, 'rep') }, LW.submitBtn(f));
    if (res) LW.done('Reward reversed');
  };
  R.actions['own-credit'] = async function (el) {
    var ds = el.dataset, pid = ds.person;
    var sh = R.sheet('<form data-form="own-credit" data-id="' + esc(ds.id) + '" class="stack"><h2>Correct credit</h2><p class="muted">' + esc(ds.label || 'Referral Reward') + '. Use this only when the introduction records were wrong.</p>' +
      '<div id="ocReps">' + LW.spinner() + '</div><div class="field"><label for="ocR">Reason</label><textarea id="ocR" name="reason" maxlength="1000"></textarea></div>' + LW.sheetButtons('Save credit') + '</form>');
    var d = pid ? LW.cache().person[pid] : null;
    if (!d && pid) { try { d = await R.cloud.rpc('person_detail', { p_person: pid }); LW.cache().person[pid] = d || {}; } catch (e) { d = null; } }
    var box = sh.querySelector('#ocReps'); if (!box || !document.body.contains(box)) return;
    var opts = arr(d && d.entries).filter(function (e) { return e.rep_id; }).map(function (e) {
      return { id: e.rep_id, name: e.rep_name, line: e.recorded_at ? 'Introduction recorded ' + R.dateTime(e.recorded_at) + (e.received_at ? ', received ' + R.date(e.received_at) : ', not confirmed received') : 'No introduction recorded' };
    });
    box.innerHTML = opts.length ? '<fieldset class="lw-radios"><legend class="lbl">Credit to</legend>' + opts.map(function (o) {
      return '<label class="check-row"><input type="radio" name="rep" value="' + esc(o.id) + '"' + (o.id === ds.rep ? ' checked' : '') + '><span><b>' + esc(o.name || 'Rep') + '</b>' + (o.line ? '<br><span class="small muted">' + esc(o.line) + '</span>' : '') + '</span></label>';
    }).join('') + '</fieldset>' : '<p class="empty">No rep has this person on their list, so nobody can be credited.</p>';
  };
  R.forms['own-credit'] = async function (f) {
    var pick = f.querySelector('input[name="rep"]:checked'), reason = LW.val(f, 'reason');
    if (!pick) { LW.setErr(f, 'Pick the rep to credit.'); return; }
    if (!reason) { LW.setErr(f, R.say('reason_required')); return; }
    var res = await R.call('correct_credit', { p_reward: f.dataset.id, p_rep: pick.value, p_reason: reason }, LW.submitBtn(f));
    if (res) LW.done('Credit corrected');
  };
  R.actions['own-close-unpaid'] = function (el) {
    var ds = el.dataset, nm = ds.name || 'this rep';
    R.sheet('<form data-form="own-close-unpaid" data-rep="' + esc(ds.rep) + '" class="stack"><h2>Close unpaid rewards</h2><p class="muted">Every reward for ' + esc(nm) + ' that isn’t paid yet is closed as not paid. Pay already issued stays as it is. This is internal: the rep is shown no reason.</p>' +
      '<fieldset class="lw-radios"><legend class="lbl">Why</legend><label class="check-row"><input type="radio" name="why" value="left"><span>Rep left</span></label>' +
      '<label class="check-row"><input type="radio" name="why" value="no_show"><span>Didn’t come out</span></label></fieldset>' + LW.sheetButtons('Close unpaid rewards', 'danger') + '</form>');
  };
  R.forms['own-close-unpaid'] = async function (f) {
    var pick = f.querySelector('input[name="why"]:checked');
    if (!pick) { LW.setErr(f, 'Pick why.'); return; }
    var res = await R.call('close_rep_unpaid', { p_rep: f.dataset.rep, p_reason: pick.value }, LW.submitBtn(f));
    if (res) LW.done('Closed ' + R.plural(Number(res.closed) || 0, 'unpaid reward'));
  };
  R.actions['own-reopen'] = function (el) {
    var ds = el.dataset, nm = ds.name || 'this rep';
    R.sheet('<form data-form="own-reopen" data-rep="' + esc(ds.rep) + '" class="stack"><h2>Reopen ' + esc(nm) + '?</h2>' +
      '<p class="muted">This ends the closure for future rewards: they can be approved, awarded and paid for again. It does not undo past closures; rewards already closed stay reversed.</p>' + LW.sheetButtons('Reopen') + '</form>');
  };
  R.forms['own-reopen'] = async function (f) {
    var res = await R.call('reopen_rep', { p_rep: f.dataset.rep }, LW.submitBtn(f));
    if (res) LW.done('Reopened. Past closures stay as they were.');
  };
  R.actions['own-clear-dnc'] = function (el) {
    R.sheet('<form data-form="own-clear-dnc" data-id="' + esc(el.dataset.id) + '" class="stack"><h2>Clear Do not contact?</h2><p class="muted">' + esc(el.dataset.name || 'This person') +
      ' counts again for every rep who has them on their list, and introductions open again. Only clear it if they asked to hear from RALLY again.</p>' + LW.sheetButtons('Clear Do not contact') + '</form>');
  };
  R.forms['own-clear-dnc'] = async function (f) {
    var res = await R.call('clear_dnc', { p_person: f.dataset.id }, LW.submitBtn(f));
    if (res) LW.done('Do not contact cleared');
  };

  /* ======================================================================================================
     INCENTIVES
     ====================================================================================================== */
  var MAX_PICS = 4, MAX_LEN = 400000;
  var DATA_IMG = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  function pics(list) { return arr(list).filter(function (u) { return typeof u === 'string' && DATA_IMG.test(u); }); }
  function incStatus(s) { return { draft: 'Draft', published: 'Published', off: 'Off' }[s] || 'Draft'; }
  function dollars(c) { c = Number(c) || 0; return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2); }
  function toCents(s) { var t = String(s == null ? '' : s).replace(/[$,\s]/g, ''); return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(parseFloat(t) * 100) : null; }
  function editState(p) {
    var C = LW.cache(), key = String(p.edit);
    if (!C.inc || C.inc.key !== key) {
      var i = key === 'new' ? null : arr(R.data.owner && R.data.owner.incentives).filter(function (x) { return x.id === key; })[0] || null;
      C.inc = { key: key, id: i ? i.id : null, name: i ? i.name || '' : '', prize: i && i.prize_cents != null ? dollars(i.prize_cents) : '', how: i ? i.how_to_earn || '' : '', pictures: i ? pics(i.pictures) : [], status: i ? i.status || 'draft' : 'draft', busy: 0 };
    }
    return C.inc;
  }
  function thumbs(e) {
    return e.pictures.map(function (u, i) {
      return '<div class="lw-thumb"><img src="' + esc(u) + '" alt="' + (i === 0 ? 'Cover picture' : 'Picture ' + (i + 1)) + '">' +
        (i === 0 ? '<span class="lw-cover">Cover</span>' : '<button type="button" class="lw-tb lw-mk" data-a="own-pic-cover" data-i="' + i + '" aria-label="Make picture ' + (i + 1) + ' the cover">Make cover</button>') +
        '<button type="button" class="lw-tb lw-x" data-a="own-pic-remove" data-i="' + i + '" aria-label="Remove picture ' + (i + 1) + '">×</button></div>';
    }).join('') + (e.pictures.length < MAX_PICS ? '<button type="button" class="lw-thumb lw-add" data-a="own-pic-add"' + (e.busy ? ' disabled' : '') + '>' + (e.busy ? 'Adding…' : '+ Add picture') + '</button>' : '');
  }
  function drawThumbs() { var e = LW.cache().inc, box = document.getElementById('oiThumbs'); if (e && box) box.innerHTML = thumbs(e); }
  function picMsg(m) { var el = document.getElementById('oiPicMsg'); if (el) el.textContent = m || ''; }
  /* Resize in the browser: at most 900 px on the long side, JPEG quality 0.82, so each data URL stays under
     400,000 characters. A rare busy photo steps down in quality, then size, until it fits. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { reject(new Error('unreadable')); return; }
        var tries = [[900, 0.82], [900, 0.72], [800, 0.66], [700, 0.6], [600, 0.55], [500, 0.5], [400, 0.5]];
        for (var i = 0; i < tries.length; i++) {
          var s = Math.min(1, tries[i][0] / Math.max(w, h)), cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
          var c = document.createElement('canvas'); c.width = cw; c.height = ch;
          var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(img, 0, 0, cw, ch);
          var data = c.toDataURL('image/jpeg', tries[i][1]);
          if (data.length < MAX_LEN && data.indexOf('data:image/jpeg;base64,') === 0) { resolve(data); return; }
        }
        reject(new Error('too_large'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  }
  async function addFiles(files) {
    var e = LW.cache().inc; if (!e) return;
    var list = Array.prototype.slice.call(files || []), msg = '';
    var room = MAX_PICS - e.pictures.length;
    if (list.length > room) { msg = R.say('too_many_pictures'); list = list.slice(0, Math.max(0, room)); }
    e.busy++; drawThumbs(); picMsg('');
    for (var i = 0; i < list.length; i++) {
      try { var u = await shrink(list[i]); if (e.pictures.length < MAX_PICS) e.pictures.push(u); }
      catch (x) { msg = x && x.message === 'too_large' ? R.say('picture_too_large') : 'That file isn’t a picture this browser can read. Try a JPEG or PNG.'; }
    }
    e.busy--; drawThumbs(); picMsg(msg);
    var err = document.getElementById('oiErr'); if (err && e.pictures.length) err.textContent = '';
  }
  function incCard(i) {
    var cover = pics(i.pictures)[0], live = i.status === 'published';
    return '<div class="card"><div class="lw-inc">' + (cover ? '<img src="' + esc(cover) + '" alt="">' : '<span class="ph" aria-hidden="true"></span>') +
      '<div class="grow"><b>' + esc(i.name || 'Untitled') + '</b><div class="small muted">' + esc(R.money(i.prize_cents) + (i.how_to_earn ? ' · ' + i.how_to_earn : '')) + '</div>' +
      '<div class="small dim">' + esc(R.plural(pics(i.pictures).length, 'picture') + (i.updated_at ? ' · updated ' + R.date(i.updated_at) : '')) + '</div></div>' +
      '<span class="chip' + (live ? ' solid' : '') + '">' + esc(incStatus(i.status)) + '</span></div><div class="lw-btns"><button class="btn xs" data-a="own-inc-edit" data-id="' + esc(i.id) + '">Edit</button>' +
      (live ? '<button class="btn xs" data-a="own-inc-award" data-id="' + esc(i.id) + '">Award to a rep</button>' : '') + '</div></div>';
  }
  function editor(p) {
    var e = editState(p), st = e.status, btns;
    if (!e.id || st === 'draft') btns = '<button class="btn sm" data-a="own-inc-save" data-s="draft">Save draft</button><button class="btn sm primary" data-a="own-inc-save" data-s="published">Publish</button>';
    else if (st === 'published') btns = '<button class="btn sm primary" data-a="own-inc-save" data-s="published">Save changes</button><button class="btn sm danger" data-a="own-inc-off" data-id="' + esc(e.id) + '">Turn off</button>';
    else btns = '<button class="btn sm" data-a="own-inc-save" data-s="off">Save changes</button><button class="btn sm primary" data-a="own-inc-save" data-s="published">Publish again</button>';
    return LW.shell('<div class="lw-back"><button class="link" data-a="own-inc-back">‹ Incentives</button></div><div class="between"><h1>' + (e.id ? 'Edit incentive' : 'New incentive') + '</h1>' +
      (e.id ? '<span class="chip">' + esc(incStatus(st)) + '</span>' : '') + '</div><section class="card lw-ed">' +
      '<div class="field"><label for="oiN">Name</label><input id="oiN" data-k="name" maxlength="80" value="' + esc(e.name) + '"></div>' +
      '<div class="field"><span class="lbl">Pictures (first one is the cover, up to 4)</span><div class="lw-thumbs" id="oiThumbs">' + thumbs(e) + '</div>' +
      '<span class="small dim" id="oiPicMsg" aria-live="polite"></span></div><input type="file" accept="image/*" multiple id="oiFile" class="sr lw-file" tabindex="-1" aria-hidden="true">' +
      '<div class="field"><label for="oiP">Prize amount ($)</label><input id="oiP" data-k="prize" inputmode="decimal" placeholder="50" value="' + esc(e.prize) + '"></div>' +
      '<div class="field"><label for="oiH">How to earn it (optional)</label><input id="oiH" data-k="how" maxlength="200" value="' + esc(e.how) + '"></div>' +
      '<p class="err" id="oiErr" aria-live="polite"></p><div class="lw-btns">' + btns + '</div>' +
      '<p class="small dim">Reps see published incentives only. A changed prize amount applies to awards made after the change.</p></section>');
  }
  function renderIncentives(p) {
    var d = R.data.owner, head = '<div class="between"><h1>Incentives</h1>' + (p.edit ? '' : '<button class="btn sm auto" data-a="own-inc-edit" data-id="new">New incentive</button>') + '</div>';
    if (!d) return LW.wait(head);
    if (p.edit) return editor(p);
    var list = arr(d.incentives), order = { published: 0, draft: 1, off: 2 };
    list = list.slice().sort(function (a, b) { return (order[a.status] == null ? 1 : order[a.status]) - (order[b.status] == null ? 1 : order[b.status]); });
    return LW.shell(head + LW.stale() + '<p class="muted">Extra prizes reps can earn, each with a name, pictures and a prize amount. Reps see published ones; you or a leader award them by hand.</p>' +
      (list.length ? '<div class="lw-grid">' + list.map(incCard).join('') + '</div>' : '<div class="card"><p class="empty">No incentives yet. Add the first one.</p></div>'));
  }
  function bindEditor() {
    var e = LW.cache().inc;
    if (!e || !(R.view.p || {}).edit) return;
    Array.prototype.forEach.call(document.querySelectorAll('#app [data-k]'), function (inp) { inp.addEventListener('input', function () { e[inp.dataset.k] = inp.value; }); });
    var file = document.getElementById('oiFile');
    if (file) file.addEventListener('change', function () { addFiles(file.files).then(function () { try { file.value = ''; } catch (x) {} }); });
  }
  R.screens['own-incentives'] = { mode: 'owner', wide: true, nav: 'owner', load: loadOwner, render: renderIncentives, after: function () { LW.visit(); bindEditor(); } };
  R.actions['own-inc-edit'] = function (el) { LW.cache().inc = null; R.go('own-incentives', { edit: el.dataset.id }); };
  R.actions['own-inc-back'] = function () { LW.cache().inc = null; R.go('own-incentives', {}); };
  R.actions['own-pic-add'] = function () { var f = document.getElementById('oiFile'); if (f) f.click(); };
  R.actions['own-pic-remove'] = function (el) { var e = LW.cache().inc; if (!e) return; e.pictures.splice(Number(el.dataset.i), 1); drawThumbs(); picMsg(''); };
  R.actions['own-pic-cover'] = function (el) { var e = LW.cache().inc; if (!e) return; var i = Number(el.dataset.i); e.pictures.unshift(e.pictures.splice(i, 1)[0]); drawThumbs(); };
  R.actions['own-inc-save'] = async function (el) {
    var e = LW.cache().inc; if (!e) return;
    var s = el.dataset.s, err = document.getElementById('oiErr');
    function no(m) { if (err) err.textContent = m; }
    var name = String(e.name || '').trim(), cents = toCents(e.prize), how = String(e.how || '').trim();
    if (!name) return no(R.say('name_required'));
    if (name.length > 80) return no(R.say('name_too_long'));
    if (cents == null) return no(R.say('prize_required'));
    if (e.busy) return no('Wait for the pictures to finish.');
    if (s === 'published' && !e.pictures.length) return no(R.say('picture_required'));
    if (e.pictures.length > MAX_PICS) return no(R.say('too_many_pictures'));
    var p = { name: name, pictures: e.pictures.slice(), prize_cents: cents, how_to_earn: how, status: s };
    if (e.id) p.id = e.id;
    var res = await R.call('incentive_save', { p: p }, el);
    if (!res) return;
    LW.cache().inc = null;
    try { await loadOwner(); } catch (x) {}
    R.toast(s === 'published' ? (e.id && e.status === 'published' ? 'Saved. Reps see the change.' : 'Published. Reps can see it now.') : s === 'off' ? 'Saved' : 'Saved as draft');
    R.go('own-incentives', {});
  };
  R.actions['own-inc-off'] = async function (el) {
    var res = await R.call('incentive_status', { p_incentive: el.dataset.id, p_status: 'off' }, el);
    if (!res) return;
    LW.cache().inc = null;
    try { await loadOwner(); } catch (x) {}
    R.toast('Turned off. Reps no longer see it.');
    R.go('own-incentives', {});
  };
  R.actions['own-inc-award'] = function (el) {
    var i = arr(R.data.owner && R.data.owner.incentives).filter(function (x) { return x.id === el.dataset.id; })[0]; if (!i) return;
    var reps = arr(R.data.owner && R.data.owner.reps).filter(function (r) { return r.id !== LW.me().id && !r.disabled && !r.closed; }).sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    if (!reps.length) { R.toast('No reps to award yet.'); return; }
    R.sheet('<form data-form="own-inc-award" data-id="' + esc(i.id) + '" data-request="' + esc(R.uuid()) + '" class="stack"><h2>Award “' + esc(i.name || 'incentive') + '”</h2><p class="muted">' + esc(R.money(i.prize_cents)) + '. It is recorded as approved and shows as Pending pay until you mark pay issued.</p>' +
      '<div class="field"><label for="oaR">Rep</label><select id="oaR" name="rep">' + reps.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc((r.name || r.email || 'Rep') + (r.team_name ? ' · ' + r.team_name : '')) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="oaN">Why it was earned</label><textarea id="oaN" name="note" maxlength="1000"></textarea></div>' +
      '<p class="small dim">Awarding the same incentive again makes a second award.</p>' + LW.sheetButtons('Award', 'win') + '</form>');
  };
  R.forms['own-inc-award'] = async function (f) {
    var note = LW.val(f, 'note');
    if (!note) { LW.setErr(f, R.say('note_required')); return; }
    var res = await R.call('award_incentive', { p_incentive: f.dataset.id, p_rep: LW.val(f, 'rep'), p_note: note, p_request: f.dataset.request }, LW.submitBtn(f));
    if (res) LW.done('Awarded. It shows as Pending pay.', 'win');
  };
})();
