/* RALLY 100: Leader Workspace (leaders, managers and the owner).
   Screens: lead-queue (what is waiting), lead-person (one Person: contact, next action, stage and meeting,
   the four requirements, outcome, notes, rep messages, referral reward, history), lead-reps (every rep in
   scope) and lead-rep (the walkthrough: the rep's list, the spot-check and the List Completion Reward).
   The owner reaches all four with the owner nav and sees a few owner-only buttons; their actions (own-*)
   live in owner.js. Shared helpers sit on R100.lw for owner.js.
   Rules kept here: requirement names in full, never codes; approved reads "Pending pay", paid reads
   "Pay issued <date>"; no dollar amount before approval; server refusals through R100.say(code); every
   server or user string through R100.esc. Edits open in sheets, so a background refresh never wipes
   what a leader is typing. */
(function () {
  'use strict';
  var R = window.R100, esc = R.esc;
  var LW = R.lw = R.lw || {};

  /* ------------------------------------------------------------ small helpers ---------------------------- */
  function arr(x) { return Array.isArray(x) ? x : []; }
  function me() { return (R.data.me && R.data.me.user) || {}; }
  function noop() {}
  function idx(stage) { return R.STAGES.indexOf(stage); }
  function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function isToday(v) { if (!v) return false; var d = new Date(v); return !isNaN(d) && ymd(d) === R.today(); }
  function clock(v) { var d = new Date(v); return isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function field(f, n) { return f.querySelector('[name="' + n + '"]'); }
  function val(f, n) { var el = field(f, n); return el ? String(el.value || '').trim() : ''; }
  function checked(f, n) { var el = field(f, n); return !!(el && el.checked); }
  function setErr(f, msg) { var e = f.querySelector('[data-err]'); if (e) e.textContent = msg || ''; }
  function submitBtn(f) { return f.querySelector('[type="submit"]'); }
  function kv(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
  function sheetButtons(label, cls) {
    return '<p class="err" data-err aria-live="polite"></p><div class="row"><button type="button" class="btn" data-a="sheet-close">Cancel</button>' +
      '<button type="submit" class="btn ' + (cls || 'primary') + '">' + esc(label) + '</button></div>';
  }
  LW.arr = arr; LW.me = me; LW.field = field; LW.val = val; LW.checked = checked; LW.setErr = setErr; LW.submitBtn = submitBtn; LW.kv = kv; LW.sheetButtons = sheetButtons;

  /* Per-user cache. R100.data is replaced on sign-out, so nothing here outlives the session. */
  LW.cache = function () {
    var uid = me().id || null;
    if (!R.data.lw || R.data.lw.uid !== uid) R.data.lw = { uid: uid, person: {}, reps: {}, sc: {}, rewards: {}, contacts: null, f: {}, inc: null };
    return R.data.lw;
  };
  LW.nav = function () { return R.isOwner() ? 'owner' : 'lead'; };

  /* ------------------------------------------------------------ loading ---------------------------------- */
  /* Each screen has load(p). after() runs it once per visit (R100.go makes a new R100.view); cached data
     renders at once and the fresh copy replaces it. Writes call LW.refresh() to reload and re-render. */
  LW.visit = function () {
    var v = R.view, s = R.screens[v.name];
    if (!s || !s.load || v.lwLoaded) return;
    v.lwLoaded = true;
    s.load(v.p || {}).then(function () { v.lwErr = null; if (R.view === v) R.render(); }, function (e) {
      if (R.view !== v) return;
      if (e && e.kind === 'auth') { R.handleError(e); return; }
      v.lwErr = (e && e.code) || 'server'; R.render();
    });
  };
  LW.refresh = function () {
    var v = R.view, s = R.screens[v.name];
    if (!s || !s.load) { R.render(); return Promise.resolve(); }
    return s.load(v.p || {}).then(function () { v.lwErr = null; if (R.view === v) R.render(); }, function (e) {
      if (e && e.kind === 'auth') { R.handleError(e); return; }
      if (R.view === v) { v.lwErr = (e && e.code) || 'server'; R.render(); }
    });
  };
  LW.done = function (msg, kind) { R.closeSheet(); if (msg) R.toast(msg, kind); return LW.refresh(); };
  LW.shell = function (inner) { return '<main class="screen lw">' + inner + '</main>'; };
  LW.spinner = function () { return '<div class="center lw-wait"><div class="spinner" aria-label="Loading"></div></div>'; };
  LW.errCard = function (code) { return '<div class="card"><h2>Couldn’t load this.</h2><p class="muted">' + esc(R.say(code)) + '</p><button class="btn sm auto" data-a="lead-retry">Try again</button></div>'; };
  LW.wait = function (head) { return LW.shell(head + (R.view.lwErr ? LW.errCard(R.view.lwErr) : LW.spinner())); };
  LW.stale = function () { var c = R.view.lwErr; return c ? '<div class="banner"><span>Couldn’t refresh. ' + esc(R.say(c)) + '</span><button class="btn xs" data-a="lead-retry">Try again</button></div>' : ''; };
  R.actions['lead-retry'] = function () { var v = R.view; v.lwLoaded = false; v.lwErr = null; R.render(); };

  function actionable(x) { return !x || x.controls !== false; }
  function loadTeam() {
    return R.load('team').then(function (d) {
      var q = (d && d.queues) || {}, n = 0;
      ['new_intros', 'meetings', 'follow_ups', 'confirmations', 'reviews', 'messages', 'matches'].forEach(function (k) { n += arr(q[k]).filter(actionable).length; });
      R.navBadges['lead-queue'] = n > 99 ? '99+' : n;
      return d;
    });
  }
  LW.loadTeam = loadTeam;

  /* ------------------------------------------------------------ shared wording --------------------------- */
  LW.personName = function (p) { return (p && (p.name || R.fullName(p))) || 'Unnamed'; };
  LW.kind = function (k) { return { list: 'List Completion Reward', referral: 'Referral Reward', incentive: 'Incentive' }[k] || 'Reward'; };
  LW.rid = function (r) { return r && (r.id || r.reward_id); };
  LW.reversed = function (r) { return !!(r && (r.reversed || r.reversed_at)); };
  LW.amt = function (r) { return r && r.amount_cents != null ? R.money(r.amount_cents) : ''; };
  function hasFlag(r, f) { return arr(r && r.flags).indexOf(f) >= 0; }
  /* rep_closed: the owner closed the credited rep's unpaid rewards (a leaving rep). Internal to leaders and the
     owner: nothing is approved, awarded or paid for that rep until the owner reopens them. */
  LW.repClosed = function (r) { return hasFlag(r, 'rep_closed'); };
  LW.statusText = function (r) {
    if (!r || !r.status) return '';
    if (r.status === 'paid') return 'Pay issued' + (r.paid_on ? ' ' + R.date(r.paid_on) : '');
    return R.STATUS_LABEL[r.status] || r.status;
  };
  LW.statusChips = function (r) {
    if (!r) return '';
    var s = r.status, rev = LW.reversed(r), cls = rev ? '' : (s === 'approved' || s === 'paid') ? ' win' : s === 'needs_correction' ? ' alert' : '';
    var h = '<span class="chip' + cls + '">' + esc(LW.statusText(r)) + '</span>';
    if (LW.reversed(r)) h += '<span class="chip alert">Reversed' + (r.reversed_at ? ' ' + esc(R.date(r.reversed_at)) : '') + '</span>';
    if (r.hold) h += '<span class="chip held">On hold: under 100</span>';
    if (hasFlag(r, 'rep_closed')) h += '<span class="chip">Rep closed</span>';
    return h;
  };
  LW.subject = function (r) {
    if (r.kind === 'list') return r.rep_name || 'Rep';
    if (r.kind === 'referral') return r.person_name || 'Unnamed';
    return r.incentive_name || r.name || 'Incentive';
  };
  LW.rlabel = function (r) {
    if (r.kind === 'list') return 'List Completion Reward for ' + (r.rep_name || 'this rep');
    if (r.kind === 'referral') return 'Referral Reward for ' + (r.person_name || 'this person') + (r.rep_name ? ', credited to ' + r.rep_name : '');
    var n = r.incentive_name || r.name;
    return 'Incentive' + (n ? ' “' + n + '”' : '') + (r.rep_name ? ' for ' + r.rep_name : '');
  };
  /* Data attributes every reward button carries, so a sheet can word itself without another lookup. */
  LW.rattrs = function (r) {
    return ' data-id="' + esc(LW.rid(r)) + '" data-kind="' + esc(r.kind || '') + '" data-label="' + esc(LW.rlabel(r)) + '"' +
      ' data-person="' + esc(r.person_id || '') + '" data-rep="' + esc(r.rep_id || '') + '" data-repname="' + esc(r.rep_name || '') + '"' +
      ' data-amount="' + esc(r.amount_cents == null ? '' : r.amount_cents) + '"' + (r.kind === 'list' && r.count != null ? ' data-count="' + esc(r.count) + '"' : '') +
      (r.spot_checked != null ? ' data-spot="' + (r.spot_checked ? 1 : 0) + '"' : r.spot_check_id !== undefined ? ' data-spot="' + (r.spot_check_id ? 1 : 0) + '"' : '');
  };
  LW.handleText = function (v) {
    if (v && typeof v === 'object') { var pl = v.platform === 'Other' ? (v.other_app || 'Other') : v.platform; return (pl ? pl + ' ' : '') + '@' + (v.handle || ''); }
    var s = String(v || ''), parts = s.split(':');
    if (parts.length >= 3 && parts[0] === 'Other') return parts[1] + ' @' + parts.slice(2).join(':');
    if (parts.length >= 2) return parts[0] + ' @' + parts.slice(1).join(':');
    return s ? '@' + s : '';
  };
  LW.entryHandle = function (e) { return e && e.handle ? (e.platform === 'Other' ? (e.other_app || 'Other') : (e.platform || '')) + ' @' + e.handle : ''; };
  LW.ident = function (x) {
    if (x == null) return { kind: 'handle', text: '' };
    if (typeof x === 'string') x = /^\d{10}$/.test(x) ? { kind: 'phone', value: x } : { kind: 'handle', value: x };
    if (x.kind === 'phone') return { kind: 'phone', value: String(x.value || ''), text: R.fmtPhone(String(x.value || '')) };
    return { kind: 'handle', text: LW.handleText(x.value != null ? x.value : x) };
  };
  var ACTION = {
    person_created: 'Added to RALLY', reward_created: 'Referral Reward opened', reward_ready: 'Referral Reward ready for review',
    stage: 'Stage changed', intro_planned: 'Introduction planned', intro_recorded: 'Introduction recorded', intro_received: 'Introduction received',
    outcome: 'Outcome changed', message: 'Rep message', meeting: 'Meeting scheduled', requirement_confirmed: 'Requirement confirmed',
    requirement_unticked: 'Requirement unticked', set_interest: 'Interest changed', next_action: 'Next action set', note: 'Note added',
    messages_read: 'Messages read', spot_check: 'Spot-check recorded', approve: 'Reward approved', needs_correction: 'Sent back: Needs correction',
    resolve_correction: 'Correction resolved', match_dismissed: 'Kept as two people', person_merged: 'People linked', award: 'Incentive awarded',
    pay_issued: 'Pay issued', reverse: 'Reward reversed', correct_credit: 'Credit corrected', close_unpaid: 'Unpaid rewards closed',
    entry_created: 'List entry added', entry_updated: 'List entry edited', entry_merged: 'Duplicate merged', entry_kept_both: 'Kept both',
    entry_removed: 'List entry removed', entry_restored: 'List entry restored'
  };
  LW.action = function (a) { a = String(a || ''); if (ACTION[a]) return ACTION[a]; var t = a.replace(/[_.]+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Change'; };
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var DKEY = { event_date: 'date', paid_on: 'paid', rep_reason: 'rep sees', text: 'next', from_stage: 'stage then' };
  function detailVal(k, v) {
    if (k === 'req') return R.REQ_LABEL[v] || v;
    if (k === 'channel') return { text: 'Text', call: 'Call', in_person: 'In person', other: 'Other' }[v] || v;
    if (k === 'said') return { in: 'In', maybe: 'Maybe', not_for_them: 'Not for them', didnt_say: 'Didn’t really say' }[v] || v;
    if (/stage$/.test(k)) return R.STAGE_LABEL[v] || v;
    if (/status$/.test(k)) return R.STATUS_LABEL[v] || v;
    if (k === 'kind') return LW.kind(v);
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return R.date(v);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return R.dateTime(v);
    return v;
  }
  /* One audit row's detail in words. from/to mean stages, outcomes or interest depending on the action; ids
     are never shown; an owner's internal reversal reason stays the owner's. */
  LW.detail = function (d, action) {
    if (d == null || d === '') return '';
    if (typeof d !== 'object') return String(d);
    var lab = action === 'outcome' ? R.OUTCOME_LABEL : action === 'set_interest' ? R.INTEREST_LABEL : R.STAGE_LABEL, out = [];
    if ('from' in d || 'to' in d) out.push((d.from ? lab[d.from] || d.from : 'none') + ' → ' + (d.to ? lab[d.to] || d.to : 'cleared'));
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (k === 'from' || k === 'to' || v == null || v === '' || typeof v === 'object') return;
      if (/(^id$|_id$|^p_|^basis$)/.test(k) || (typeof v === 'string' && UUID.test(v))) return;
      if (/reason/.test(k) && /^(reverse|close_unpaid)$/.test(action) && !R.isOwner()) return;
      out.push((DKEY[k] || k.replace(/_/g, ' ')) + ': ' + detailVal(k, v));
    });
    return out.slice(0, 5).join(' · ');
  };
  var CHANNEL = { text: 'by text', call: 'by call', in_person: 'in person', other: 'another way' };
  var SAID = { in: 'they said In', maybe: 'they said Maybe', not_for_them: 'they said Not for them', didnt_say: 'they didn’t really say' };
  var SIGNAL = { phone: 'Same phone number, different last name', handle: 'Same social handle, different last name', name: 'Same name' };

  /* Back link: every detail screen remembers where it was opened from. */
  var BACK = { 'lead-queue': 'Queue', 'lead-reps': 'Reps', 'lead-rep': 'Rep', 'lead-person': 'Back', 'own-dash': 'Dashboard', 'own-contacts': 'Contacts', 'own-rewards': 'Rewards', 'own-incentives': 'Incentives' };
  function backLink(p, dflt) { return '<div class="lw-back"><button class="link" data-a="lead-back">‹ ' + esc(BACK[p.from] || BACK[dflt]) + '</button></div>'; }
  function tabFor(from, dflt) { return { 'own-contacts': 'own-contacts', 'own-rewards': 'own-rewards', 'own-dash': 'own-dash', 'lead-reps': 'lead-reps', 'lead-rep': 'lead-reps', 'lead-queue': 'lead-queue' }[from] || dflt; }
  R.actions['lead-back'] = function () { var p = R.view.p || {}, dflt = R.view.name === 'lead-rep' ? 'lead-reps' : 'lead-queue'; R.go(p.from || dflt, p.fromP || {}); };
  R.actions['lead-open-person'] = function (el) { if (el.dataset.id) R.go('lead-person', { id: el.dataset.id, from: R.view.name, fromP: R.view.p }); };
  R.actions['lead-open-rep'] = function (el) { if (el.dataset.id) R.go('lead-rep', { id: el.dataset.id, from: R.view.name, fromP: R.view.p }); };
  R.actions['lead-jump'] = function (el) { var t = document.getElementById(el.dataset.k); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  /* ======================================================================================================
     QUEUE
     ====================================================================================================== */
  var QS = [
    { id: 'q-new', key: 'new_intros', title: 'New introductions', chip: 'New', one: 'new introduction', many: 'new introductions', kind: 'new' },
    { id: 'q-meet', key: 'meetings', title: 'Meetings', chip: 'Meetings', one: 'meeting', many: 'meetings', kind: 'meet' },
    { id: 'q-due', key: 'follow_ups', title: 'Follow-ups due', chip: 'Due', one: 'follow-up due', many: 'follow-ups due', kind: 'due' },
    { id: 'q-conf', key: 'confirmations', title: 'Confirmations to finish', chip: 'Confirm', one: 'confirmation to finish', many: 'confirmations to finish', kind: 'conf' },
    { id: 'q-rev', key: 'reviews', title: 'Reviews', chip: 'Review', one: 'review', many: 'reviews', kind: 'rev' },
    { id: 'q-msg', key: 'messages', title: 'Rep messages', chip: 'Messages', one: 'rep message', many: 'rep messages', kind: 'msg' },
    { id: 'q-dup', key: 'matches', title: 'Possible duplicate people', chip: 'Duplicates', one: 'possible duplicate', many: 'possible duplicates', kind: 'dup' }
  ];
  function byTime(k, desc) { return function (a, b) { var x = String(a[k] || ''), y = String(b[k] || ''); return desc ? (x < y ? 1 : x > y ? -1 : 0) : (x < y ? -1 : x > y ? 1 : 0); }; }
  function queueLists(d) {
    var q = (d && d.queues) || {}, out = {};
    QS.forEach(function (s) { out[s.key] = arr(q[s.key]).slice(); });
    out.new_intros.sort(byTime('updated_at'));
    out.meetings.sort(byTime('meeting_at'));
    out.follow_ups.sort(byTime('outcome_date'));
    return out;
  }
  function personItem(q, kind) {
    var meta = [], chips = '', reps = arr(q.reps).join(', '), ro = q.controls === false;
    if (kind === 'new') { meta.push(reps ? 'Introduced by ' + reps : 'Introduced'); if (q.updated_at) meta.push(R.date(q.updated_at)); }
    else if (kind === 'meet') {
      meta.push(q.meeting_at ? 'Meeting ' + (isToday(q.meeting_at) ? 'today ' + clock(q.meeting_at) : R.dateTime(q.meeting_at)) : 'Meeting scheduled');
      if (reps) meta.push(reps);
      if (isToday(q.meeting_at)) chips += '<span class="chip solid">Today</span>';
    } else if (kind === 'due') {
      meta.push(q.outcome === 'follow_up' ? 'Follow up later' + (q.outcome_date ? ', due ' + R.date(q.outcome_date) : '') : 'Follow-up due');
      if (reps) meta.push(reps);
    } else {
      meta.push(R.STAGE_LABEL[q.stage] || q.stage || '');
      meta.push((q.confirmed_count || 0) + ' of 4 confirmed');
      if (reps) meta.push(reps);
    }
    if (ro) chips = '<span class="chip">Another team runs this</span>';
    return '<button class="qitem' + (ro ? ' lw-ro' : '') + '" data-a="lead-open-person" data-id="' + esc(q.person_id) + '"><span class="qtop"><span class="nm">' + esc(q.name || 'Unnamed') + '</span>' + chips + '</span>' +
      '<span class="meta">' + esc(meta.filter(Boolean).join(' · ')) + '</span>' + (!ro && q.next_action ? '<span class="meta">Next: ' + esc(q.next_action) + '</span>' : '') + '</button>';
  }
  function reviewItem(r) {
    var list = r.kind === 'list';
    var sub = list ? 'List Completion Reward' : LW.kind(r.kind) + (r.rep_name ? ' · credited to ' + r.rep_name : ' · no rep credited yet');
    var chips = LW.statusChips(r);
    if (list) chips += '<span class="chip">Spot-check: ' + (r.spot_checked ? 'done' : 'not done') + '</span>';
    if (arr(r.flags).indexOf('no_intro') >= 0) chips += '<span class="chip alert">No introduction recorded</span>';
    var a = list ? 'data-a="lead-open-rep" data-id="' + esc(r.rep_id) + '"' : 'data-a="lead-open-person" data-id="' + esc(r.person_id) + '"';
    return '<button class="qitem" ' + a + '><span class="qtop"><span class="nm">' + esc(LW.subject(r)) + '</span></span><span class="meta">' + esc(sub) + '</span><span class="chips">' + chips + '</span></button>';
  }
  function msgItem(m) {
    return '<button class="qitem" data-a="lead-open-person" data-id="' + esc(m.person_id) + '"><span class="qtop"><span class="nm">' + esc((m.rep_name || 'A rep') + ' about ' + (m.person_name || 'a contact')) + '</span>' +
      '<span class="small dim">' + esc(R.date(m.created_at)) + '</span></span><span class="meta lw-msg">' + esc(m.body) + '</span></button>';
  }
  function matchItem(pm) {
    var a = pm.a || {}, b = pm.b || {};
    function nm(x) { return '<button class="link" data-a="lead-open-person" data-id="' + esc(x.id) + '">' + esc(x.name || 'Unnamed') + '</button>'; }
    return '<div class="qitem static"><span class="qtop"><span class="nm">' + nm(a) + ' <span class="dim">and</span> ' + nm(b) + '</span></span>' +
      '<span class="meta">' + esc(SIGNAL[pm.signal] || 'Possible match') + '. Same person? Linking joins them into one record.</span>' +
      '<span class="lw-btns"><button class="btn xs" data-a="lead-match-link" data-id="' + esc(pm.id) + '" data-an="' + esc(a.name || '') + '" data-bn="' + esc(b.name || '') + '">Same person: link</button>' +
      '<button class="btn xs" data-a="lead-match-dismiss" data-id="' + esc(pm.id) + '">Different people</button></span></div>';
  }
  function itemFor(s, x) { return s.kind === 'rev' ? reviewItem(x) : s.kind === 'msg' ? msgItem(x) : s.kind === 'dup' ? matchItem(x) : personItem(x, s.kind); }
  function nextUp(L0) {
    var L = {}; Object.keys(L0).forEach(function (k) { L[k] = L0[k].filter(actionable); });
    var m = L.meetings[0]; if (m) return { a: 'lead-open-person', id: m.person_id, text: m.name + ' · meeting ' + (isToday(m.meeting_at) ? 'today ' + clock(m.meeting_at) : R.dateTime(m.meeting_at)) };
    var n = L.new_intros[0]; if (n) return { a: 'lead-open-person', id: n.person_id, text: n.name + ' · new introduction' };
    var f = L.follow_ups[0]; if (f) return { a: 'lead-open-person', id: f.person_id, text: f.name + ' · follow-up due' };
    var c = L.confirmations[0]; if (c) return { a: 'lead-open-person', id: c.person_id, text: c.name + ' · ' + (c.confirmed_count || 0) + ' of 4 confirmed' };
    var r = L.reviews[0]; if (r) return r.kind === 'list' ? { a: 'lead-open-rep', id: r.rep_id, text: (r.rep_name || 'Rep') + ' · list review' } : { a: 'lead-open-person', id: r.person_id, text: (r.person_name || 'Unnamed') + ' · reward review' };
    return null;
  }
  function renderQueue() {
    var d = R.data.team, team = R.isOwner() ? 'All teams' : (me().team_name || '');
    var top = '<div class="lw-top"><div class="between"><h1>Queue</h1>' + (team ? '<span class="small dim">' + esc(team) + '</span>' : '') + '</div>';
    if (!d) return LW.wait(top + '</div>');
    var L = queueLists(d), parts = [], chips = '', sections = { a: '', b: '' }, any = false;
    QS.forEach(function (s, i) {
      var list = L[s.key], n = list.filter(actionable).length; if (!list.length) return;
      any = true;
      if (n) {
        parts.push(n + ' ' + (n === 1 ? s.one : s.many) + '.');
        chips += '<button class="cbtn" data-a="lead-jump" data-k="' + s.id + '">' + esc(s.chip) + ' ' + n + '</button>';
      }
      sections[i < 4 ? 'a' : 'b'] += '<section class="card lw-q" id="' + s.id + '"><div class="between"><h2>' + esc(s.title) + '</h2><span class="chip">' + list.length + '</span></div><div class="queue">' + list.map(function (x) { return itemFor(s, x); }).join('') + '</div></section>';
    });
    if (!any) return LW.shell(top + '</div>' + LW.stale() + '<div class="card lw-empty"><h2>Nothing waiting. Nice.</h2><p class="muted">New introductions, meetings, follow-ups, confirmations and reviews land here.</p></div>');
    if (!parts.length) parts.push('Nothing waiting. Nice.');
    var nx = nextUp(L);
    var body = sections.a && sections.b ? '<div class="cols two"><div class="stack lw-col">' + sections.a + '</div><div class="stack lw-col">' + sections.b + '</div></div>' : '<div class="stack lw-col">' + sections.a + sections.b + '</div>';
    return LW.shell(top + '<p class="lw-sum">' + esc(parts.join(' ')) + '</p><div class="chips">' + chips + '</div></div>' + LW.stale() + body +
      (nx ? '<div class="lw-next"><button class="btn primary" data-a="' + nx.a + '" data-id="' + esc(nx.id) + '">' + esc('Next: ' + nx.text) + '</button></div>' : ''));
  }
  R.screens['lead-queue'] = {
    mode: 'lead', wide: true,
    get nav() { return LW.nav(); },
    load: function () { return loadTeam(); },
    render: renderQueue,
    after: function () { LW.visit(); }
  };

  /* Possible duplicate people: link (merge B into A) or dismiss. */
  R.actions['lead-match-link'] = function (el) {
    var a = el.dataset.an || 'the first person', b = el.dataset.bn || 'the second person';
    R.sheet('<form data-form="lead-match-link" data-id="' + esc(el.dataset.id) + '" class="stack"><h2>Same person?</h2>' +
      '<p class="muted">Link ' + esc(a) + ' and ' + esc(b) + ' as one person. Phone numbers, handles, list entries, introductions and requirements join one record, the one that already has a referral reward if either does. Each rep keeps their own +1. This can’t be undone here.</p>' +
      sheetButtons('Link them') + '</form>');
  };
  R.forms['lead-match-link'] = async function (f) {
    var res = await R.call('link_persons', { p_match: f.dataset.id, p_action: 'link' }, submitBtn(f));
    if (res) LW.done('Linked as one person');
  };
  R.actions['lead-match-dismiss'] = async function (el) {
    var res = await R.call('link_persons', { p_match: el.dataset.id, p_action: 'dismiss' }, el);
    if (res) LW.done('Kept as two people');
  };

  /* ======================================================================================================
     PERSON
     ====================================================================================================== */
  function loadPerson(p) {
    return R.cloud.rpc('person_detail', { p_person: p.id }).then(function (d) { LW.cache().person[p.id] = d || {}; return d; });
  }
  LW.loadPerson = loadPerson;
  function reqRows(d) {
    var by = {};
    arr(d.requirements).forEach(function (r) { by[Number(r.req)] = r; });
    return [1, 2, 3, 4].map(function (k) { return Object.assign({}, by[k] || {}, { req: k, confirmed: !!(by[k] && by[k].confirmed) }); });
  }
  function personFor(uid, d, P) {
    if (!uid) return '';
    if (uid === me().id) return (me().name || 'You') + ' (you)';
    if (P.next_action_owner === uid && P.next_action_owner_name) return P.next_action_owner_name;
    var e = arr(d.entries).filter(function (x) { return x.rep_id === uid; })[0]; if (e && e.rep_name) return e.rep_name;
    if (P.responsible_leader === uid && P.responsible_leader_name) return P.responsible_leader_name;
    var o = R.data.owner && arr(R.data.owner.leaders).filter(function (x) { return x.id === uid; })[0]; if (o) return o.name;
    var t = R.data.team && arr(R.data.team.reps).filter(function (x) { return x.id === uid; })[0]; if (t) return t.name;
    return '';
  }
  function identityCard(d, P, id, ctl) {
    var phones = [], handles = [];
    arr(d.identifiers).forEach(function (x) { var i = LW.ident(x); if (i.text) (i.kind === 'phone' ? phones : handles).push(i); });
    var h = kv('Phone', phones.length ? phones.map(function (i) { return R.phoneOk(i.value) ? '<a href="tel:' + i.value + '">' + esc(i.text) + '</a>' : esc(i.text); }).join('<br>') : '<span class="dim">None yet</span>');
    h += kv('Social', handles.length ? handles.map(function (i) { return esc(i.text); }).join('<br>') : '<span class="dim">None yet</span>');
    if (P.created_at) h += kv('Added', esc(R.dateLong(P.created_at)));
    if (P.responsible_leader_name) h += kv('Leader', esc(P.responsible_leader_name));
    h += kv('Person ID', '<span class="dim small">' + esc(id) + '</span>');
    var cur = P.interest || 'unknown';
    if (!ctl) return '<section class="card"><h2>Contact</h2><dl class="lw-kv">' + h + kv('Interest', esc(R.INTEREST_LABEL[cur] || 'Unknown')) + '</dl></section>';
    var chips = ['unknown', 'interested', 'maybe', 'not_interested'].map(function (k) {
      return '<button type="button" class="cbtn' + (k === cur ? ' on' : '') + '" aria-pressed="' + (k === cur) + '" data-a="lead-interest" data-id="' + esc(id) + '" data-v="' + k + '">' + esc(R.INTEREST_LABEL[k]) + '</button>';
    }).join('');
    return '<section class="card"><h2>Contact</h2><dl class="lw-kv">' + h + '</dl><div class="field"><span class="lbl" id="lwInt">Interest</span><div class="chips" role="group" aria-labelledby="lwInt">' + chips + '</div></div></section>';
  }
  function nextCard(d, P, id) {
    var who = personFor(P.next_action_owner, d, P);
    var line = P.next_action ? 'Next: ' + (who ? who + ', ' : '') + P.next_action + (P.next_action_date ? ' · ' + R.date(P.next_action_date) : '') : '';
    var i = idx(P.stage), need = !P.next_action && !P.outcome && i >= idx('introduced') && i <= idx('start_confirmed');
    return '<section class="card"><div class="between"><h2>Next</h2><button class="btn xs" data-a="lead-next" data-id="' + esc(id) + '">' + (P.next_action ? 'Change' : 'Set next action') + '</button></div>' +
      (line ? '<p class="lw-msg">' + esc(line) + '</p>' : '<p class="muted">No next action yet.</p>') +
      (need ? '<p class="small lw-warn">Say what happens next and who does it.</p>' : '') + '</section>';
  }
  function stageCard(d, P, id, reqs, ctl) {
    var st = P.stage || 'added', i = idx(st), ents = arr(d.entries);
    var received = ents.some(function (e) { return e.received_at; });
    var rec = ents.map(function (e) { return e.recorded_at; }).filter(Boolean).sort()[0];
    var h = '<section class="card"><div class="between"><h2>Stage</h2><span class="chip">' + esc(R.STAGE_LABEL[st] || st) + '</span></div>';
    if (st === 'introduced' && !received) h += '<p class="small muted">Introduced (rep-reported' + (rec ? ', ' + esc(R.date(rec)) : '') + '). Confirm the introduction received under “Known by”.</p>';
    if (P.meeting_at) h += '<p>Meeting: ' + esc(R.dateTime(P.meeting_at)) + (P.meeting_how ? ' · ' + esc(P.meeting_how) : '') + '</p>' + (P.meeting_note ? '<p class="small muted lw-msg">' + esc(P.meeting_note) + '</p>' : '');
    if (P.start_date) h += '<p class="small muted">Start date ' + esc(R.dateLong(P.start_date)) + '</p>';
    var implied = Math.min(4, i - idx('meeting_completed') + 1), gaps = [];
    for (var k = 1; k <= implied; k++) if (!reqs[k - 1].confirmed) gaps.push(R.REQ_LABEL[k]);
    if (gaps.length && ctl) h += '<p class="small lw-warn">Stage is ' + esc(R.STAGE_LABEL[st]) + ', but ' + esc(gaps.join(', ')) + (gaps.length === 1 ? ' is' : ' are') + ' not confirmed. Confirm ' + (gaps.length === 1 ? 'it' : 'them') + ' under Requirements or move the stage back.</p>';
    if (!ctl) return h + '</section>';
    return h + '<p class="small dim">Changing the stage does not tick a requirement.</p><div class="lw-btns"><button class="btn sm" data-a="lead-stage" data-id="' + esc(id) + '">Change stage</button>' +
      '<button class="btn sm" data-a="lead-meet" data-id="' + esc(id) + '">' + (P.meeting_at ? 'Change meeting' : 'Schedule meeting') + '</button></div></section>';
  }
  function reqCard(P, id, reqs, rw, ctl, selfIntro) {
    var locked = rw && (rw.status === 'approved' || rw.status === 'paid') && !LW.reversed(rw), can = ctl && !selfIntro;
    var n = reqs.filter(function (r) { return r.confirmed; }).length;
    var rows = reqs.map(function (r) {
      var label = R.REQ_LABEL[r.req];
      if (r.req === 4 && r.confirmed && P.travel_na) label = 'Start date confirmed. No travel needed.';
      var meta = r.confirmed ? 'Confirmed by ' + (r.by_name || 'a leader') + (r.event_date ? ', ' + R.date(r.event_date) : '') : 'Not yet';
      var extra = [];
      if (r.req === 4 && r.confirmed) { if (P.start_date) extra.push('Start date ' + R.dateLong(P.start_date)); if (!P.travel_na && P.travel_note) extra.push('Travel: ' + P.travel_note); }
      if (r.note) extra.push(r.note);
      var btn = !can ? '' : r.confirmed ? (locked ? '' : '<button class="btn xs" data-a="lead-req" data-id="' + esc(id) + '" data-req="' + r.req + '" data-on="0">Untick</button>')
        : '<button class="btn xs" data-a="lead-req" data-id="' + esc(id) + '" data-req="' + r.req + '" data-on="1">Confirm</button>';
      return '<div class="lw-req"><span class="ck' + (r.confirmed ? ' on' : '') + '" aria-hidden="true">' + (r.confirmed ? R.ICON.check : '') + '</span><div class="grow"><div class="lw-rq">' + esc(label) + '</div>' +
        '<div class="small ' + (r.confirmed ? 'win-ink' : 'muted') + '">' + esc(meta) + '</div>' + extra.map(function (x) { return '<div class="small muted lw-msg">' + esc(x) + '</div>'; }).join('') + '</div>' + btn + '</div>';
    }).join('');
    return '<section class="card"><div class="between"><h2>Requirements</h2><span class="chip' + (n === 4 ? ' win' : '') + '">' + n + ' of 4 confirmed</span></div>' + rows +
      (!ctl ? '<p class="small muted">The team that runs this person confirms these.</p>'
        : selfIntro ? '<p class="small muted">You introduced this person, so another leader or the owner confirms these.</p>'
        : locked ? '<p class="small muted">' + esc(R.say('locked_reward')) + '</p>' : '<p class="small dim">Each one is confirmed on its own, with a date. A stage change never ticks one.</p>') + '</section>';
  }
  function outcomeCard(P, id, owner, dnc, ctl) {
    var oc = P.outcome, h = '<section class="card"><h2>Outcome</h2>';
    if (!oc) h += '<p class="muted">No outcome. Follow up later and Not interested still count on the rep’s list.</p>';
    else h += '<p><b>' + esc(R.OUTCOME_LABEL[oc] || oc) + '</b>' + (oc === 'follow_up' && P.outcome_date ? ' · ' + esc(R.date(P.outcome_date)) : '') + '</p>' + (P.outcome_note ? '<p class="small muted lw-msg">' + esc(P.outcome_note) + '</p>' : '');
    if (dnc) h += owner ? '<div class="lw-btns"><button class="btn sm" data-a="own-clear-dnc" data-id="' + esc(id) + '" data-name="' + esc(LW.personName(P)) + '">Clear Do not contact</button></div>' : '<p class="small muted">Only the owner can clear Do not contact.</p>';
    else h += '<div class="lw-btns">' + (ctl ? ['follow_up', 'not_interested', 'do_not_contact'] : ['do_not_contact']).map(function (k) {
      return '<button class="btn xs' + (k === 'do_not_contact' ? ' danger' : '') + '" data-a="lead-outcome" data-id="' + esc(id) + '" data-v="' + k + '">' + esc(R.OUTCOME_LABEL[k]) + '</button>';
    }).join('') + (oc && ctl ? '<button class="btn xs" data-a="lead-outcome-clear" data-id="' + esc(id) + '">Clear outcome</button>' : '') + '</div>';
    return h + '</section>';
  }
  function notesCard(d, id) {
    var notes = arr(d.notes);
    return '<section class="card"><h2>Notes</h2>' + (notes.length ? notes.map(function (n) {
      return '<div class="lw-note"><div class="small muted">' + esc((n.author_name || 'Leader') + ' · ' + R.dateTime(n.created_at)) + '</div><div class="lw-msg">' + esc(n.body) + '</div></div>';
    }).join('') : '<p class="empty">No notes yet.</p>') +
      '<form data-form="lead-note" data-id="' + esc(id) + '" class="stack"><div class="field"><label for="lwNote">Add a note</label><textarea id="lwNote" name="body" maxlength="2000"></textarea>' +
      '<span class="small dim">Never type card or bank details here.</span></div><p class="err" data-err aria-live="polite"></p><button class="btn sm auto" type="submit">Add note</button></form></section>';
  }
  function messagesCard(d, id) {
    var msgs = arr(d.messages); if (!msgs.length) return '';
    var unread = msgs.filter(function (m) { return !m.read_at; }).length;
    return '<section class="card"><div class="between"><h2>Rep messages</h2>' + (unread ? '<span class="chip alert">' + unread + ' new</span>' : '') + '</div>' + msgs.map(function (m) {
      return '<div class="lw-note"><div class="small muted">' + esc((m.rep_name || 'Rep') + ' · ' + R.dateTime(m.created_at) + (m.read_at ? '' : ' · New')) + '</div><div class="lw-msg">' + esc(m.body) + '</div></div>';
    }).join('') + (unread ? '<div class="lw-btns"><button class="btn sm" data-a="lead-read" data-id="' + esc(id) + '">Mark read</button></div>' : '') + '</section>';
  }
  function knownCard(d, id, rw) {
    var ents = arr(d.entries);
    var h = '<section class="card"><h2>' + (ents.length === 1 ? 'Known by 1 rep' : 'Known by ' + ents.length + ' reps') + '</h2>';
    if (!ents.length) h += '<p class="empty">No rep has this person on their list.</p>';
    h += ents.map(function (e) {
      if (!e.rep_id) return '<div class="lw-ent"><b>' + esc(e.rep_name || 'A rep on another team') + '</b></div>';
      var bits = [];
      if (e.added_at) bits.push('Added ' + R.date(e.added_at));
      if (arr(e.tags).length) bits.push(arr(e.tags).join(', '));
      var introduced = !!(e.introduced || e.recorded_at), intro;
      if (introduced) {
        intro = 'Introduction recorded' + (e.recorded_at ? ' ' + R.dateTime(e.recorded_at) : '') + (CHANNEL[e.channel] ? ', ' + CHANNEL[e.channel] : '') + (SAID[e.said] ? '; ' + SAID[e.said] : '') + '.' +
          (e.received_at ? ' Received ' + R.date(e.received_at) + '.' : ' Not confirmed received yet.');
      } else intro = 'No introduction recorded.';
      return '<div class="lw-ent"><button class="link" data-a="lead-open-rep" data-id="' + esc(e.rep_id) + '">' + esc(e.rep_name || 'Rep') + '</button>' +
        (bits.length ? '<div class="small muted">' + esc(bits.join(' · ')) + '</div>' : '') + '<div class="small">' + esc(intro) + '</div>' +
        (introduced && !e.received_at ? (e.rep_id === me().id ? '<div class="small muted">Your own introduction: another leader or the owner confirms it.</div>'
          : '<div class="lw-btns"><button class="btn xs" data-a="lead-intro-ok" data-id="' + esc(id) + '" data-rep="' + esc(e.rep_id) + '">Confirm introduction received</button></div>') : '') + '</div>';
    }).join('');
    if (rw && rw.rep_name && ['ready', 'needs_correction', 'approved', 'paid'].indexOf(rw.status) >= 0) h += '<p class="small">The Referral Reward goes to <b>' + esc(rw.rep_name) + '</b>: first introduction recorded and confirmed received.</p>';
    return h + '<p class="small dim">Rule: the Referral Reward goes to whoever signs them first, meaning the first introduction recorded in the app and confirmed received.</p></section>';
  }
  function rewardCard(rw, n) {
    var s = rw.status, rev = LW.reversed(rw), owner = R.isOwner(), self = rw.rep_id && rw.rep_id === me().id;
    var won = (s === 'approved' || s === 'paid') && !rev;
    var h = '<section class="card' + (won ? ' win' : '') + '"><div class="between"><h2>Referral Reward</h2><span class="chips">' + LW.statusChips(rw) + '</span></div>';
    h += '<p>' + (rw.rep_name ? 'Credited to <b>' + esc(rw.rep_name) + '</b>' : 'No rep credited yet.') + '</p>';
    if (arr(rw.flags).indexOf('no_intro') >= 0) h += '<p class="small lw-warn">No introduction is on record, so no rep is credited. The owner decides.</p>';
    if (won) h += '<div class="lw-paid"><img class="stamp" src="' + R.PANTHER + '" alt="Confirmed by RALLY"><div><b>' + esc((LW.amt(rw) ? LW.amt(rw) + ' · ' : '') + LW.statusText(rw)) + '</b>' +
      (rw.approved_at ? '<div class="small muted">' + esc('Approved ' + R.date(rw.approved_at) + (rw.approved_by_name ? ' by ' + rw.approved_by_name : '')) + '</div>' : '') +
      (s === 'paid' && owner && rw.paid_method ? '<div class="small muted">' + esc(rw.paid_method + (rw.paid_reference ? ' · ' + rw.paid_reference : '')) + '</div>' : '') + '</div></div>';
    if (s === 'in_progress' && !rev) h += '<p class="small muted">' + n + ' of 4 confirmed. It goes to review when all four are confirmed.</p>';
    if (s === 'needs_correction' && rw.correction_note) h += '<p class="small lw-msg">Needs correction: ' + esc(rw.correction_note) + '</p>';
    if (rev) h += '<p class="small muted">' + esc('Reversed' + (rw.reversed_at ? ' ' + R.date(rw.reversed_at) : '') + '.' + (owner && rw.reversed_reason ? ' Internal reason: ' + rw.reversed_reason : '')) + '</p>';
    var b = '', at = LW.rattrs(rw), closed = LW.repClosed(rw);
    if (closed && !rev) h += '<p class="small muted">Rep closed: nothing is approved or paid for this rep until the owner reopens them.</p>';
    if (!rev && s === 'ready') {
      if (self) h += '<p class="small muted">' + esc(R.say('self_involved')) + '</p>';
      else b += (closed ? '' : '<button class="btn sm win" data-a="lead-approve"' + at + '>Approve</button>') + '<button class="btn sm" data-a="lead-correct"' + at + '>Needs correction</button>';
    }
    if (!rev && s === 'needs_correction') b += '<button class="btn sm" data-a="lead-resolve"' + at + '>Correction resolved</button>';
    if (owner && !rev) {
      if (s === 'approved' && !closed) b += '<button class="btn sm" data-a="own-pay"' + at + '>Mark pay issued</button>';
      if (s === 'in_progress' || s === 'ready' || s === 'needs_correction') b += '<button class="btn sm" data-a="own-credit"' + at + '>Correct credit</button>';
      b += '<button class="btn sm danger" data-a="own-reverse"' + at + '>Reverse</button>';
    }
    return h + (b ? '<div class="lw-btns">' + b + '</div>' : '') + '</section>';
  }
  function historyCard(d) {
    var h = arr(d.history);
    return '<section class="card"><details class="lw-hist"><summary>History (' + h.length + ')</summary>' + (h.length ? h.map(function (x) {
      var det = LW.detail(x.detail, x.action);
      return '<div class="lw-hrow"><b>' + esc(LW.action(x.action)) + '</b> · ' + esc((x.actor_name || 'RALLY') + ' · ' + R.dateTime(x.at || x.created_at)) + (det ? '<div class="lw-msg">' + esc(det) + '</div>' : '') + '</div>';
    }).join('') : '<p class="empty">Nothing yet.</p>') + '</details></section>';
  }
  function renderPerson(p) {
    var d = LW.cache().person[p.id], head = backLink(p, 'lead-queue');
    if (!d) return LW.wait(head);
    var P = d.person || {}, id = P.id || p.id, nm = LW.personName(P), owner = R.isOwner();
    var reqs = reqRows(d), n = reqs.filter(function (r) { return r.confirmed; }).length;
    var rw = d.reward ? Object.assign({ kind: 'referral', person_name: nm, person_id: id }, d.reward) : null;
    var dnc = P.outcome === 'do_not_contact' || P.dnc === true;
    var unread = arr(d.messages).some(function (m) { return !m.read_at; });
    var ctl = P.controls !== false, selfIntro = arr(d.entries).some(function (e) { return e.rep_id && e.rep_id === me().id && (e.introduced || e.recorded_at); });
    var chips = '<span class="chip">' + esc(R.STAGE_LABEL[P.stage] || P.stage || 'Added') + '</span>' +
      (P.outcome ? '<span class="chip' + (dnc ? ' alert' : '') + '">' + esc(R.OUTCOME_LABEL[P.outcome] || P.outcome) + '</span>' : '') +
      '<span class="chip">Interest: ' + esc(R.INTEREST_LABEL[P.interest] || 'Unknown') + '</span>';
    var banner = dnc ? '<div class="banner"><span><b>Do not contact.</b> This person asked not to be contacted by RALLY. They don’t count toward any rep’s 100 and are out of every queue.' + (owner ? '' : ' Only the owner can clear it.') + '</span></div>' : '';
    if (!ctl) banner += '<div class="strip"><span>Another team runs this person. You can view it, add notes and set Do not contact.</span></div>';
    var left = (unread ? messagesCard(d, id) : '') + identityCard(d, P, id, ctl) + (ctl ? nextCard(d, P, id) : '') + stageCard(d, P, id, reqs, ctl) + reqCard(P, id, reqs, rw, ctl, selfIntro) + outcomeCard(P, id, owner, dnc, ctl) + notesCard(d, id);
    var right = (rw ? rewardCard(rw, n) : '') + knownCard(d, id, rw) + (unread ? '' : messagesCard(d, id)) + historyCard(d);
    return LW.shell(head + LW.stale() + '<div class="lw-head"><h1>' + esc(nm) + '</h1><div class="chips">' + chips + '</div></div>' + banner +
      '<div class="cols two"><div class="stack lw-col">' + left + '</div><div class="stack lw-col">' + right + '</div></div>');
  }
  R.screens['lead-person'] = {
    mode: 'lead', wide: true,
    get nav() { return LW.nav(); },
    get tab() { return tabFor((R.view.p || {}).from, 'lead-queue'); },
    load: loadPerson,
    render: renderPerson,
    after: function () { LW.visit(); }
  };
  function cur(id) { var d = LW.cache().person[id] || {}; return { d: d, P: d.person || {}, name: LW.personName(d.person || {}) }; }

  /* ---- stage */
  R.actions['lead-stage'] = function (el) {
    var id = el.dataset.id, c = cur(id), st = c.P.stage || 'added';
    var opts = R.STAGES.map(function (s) {
      var repStep = idx(s) > idx(st) && idx(s) < idx('meeting_scheduled');
      return '<option value="' + s + '"' + (s === st ? ' selected' : '') + (repStep ? ' disabled' : '') + '>' + esc(R.STAGE_LABEL[s] + (repStep ? ' (the rep’s step)' : '')) + '</option>';
    }).join('');
    var sh = R.sheet('<form data-form="lead-stage" data-id="' + esc(id) + '" data-cur="' + esc(st) + '" class="stack"><h2>Change stage</h2><p class="muted small">' + esc(c.name) + ' is at ' + esc(R.STAGE_LABEL[st] || st) + '.</p>' +
      '<div class="field"><label for="lwSt">Stage</label><select id="lwSt" name="stage">' + opts + '</select></div><p class="small lw-hint" id="lwStHint" aria-live="polite"></p>' +
      '<div class="field"><label for="lwStD">Date</label><input id="lwStD" name="date" type="date" value="' + R.today() + '"></div>' +
      '<div class="field"><label for="lwStN">Note</label><textarea id="lwStN" name="note" maxlength="1000" placeholder="Needed when you move the stage back"></textarea></div>' +
      '<p class="small dim">Changing the stage does not tick a requirement.</p>' + sheetButtons('Save stage') + '</form>');
    var sel = sh.querySelector('#lwSt'), hint = sh.querySelector('#lwStHint');
    function upd() {
      var s = sel.value;
      hint.textContent = idx(s) < idx(st) ? 'Moving the stage back needs a note.' : s === 'meeting_completed' && st !== s ? 'Also confirm “Meeting completed” under Requirements if the meeting actually happened. Changing the stage does not tick it for you.' : '';
    }
    sel.addEventListener('change', upd); upd();
  };
  R.forms['lead-stage'] = async function (f) {
    var st = f.dataset.cur, s = val(f, 'stage'), date = val(f, 'date'), note = val(f, 'note');
    if (s === st) { setErr(f, 'Pick a different stage.'); return; }
    if (!date) { setErr(f, R.say('date_required')); return; }
    if (idx(s) < idx(st) && !note) { setErr(f, R.say('reason_required')); return; }
    var res = await R.call('set_stage', { p_person: f.dataset.id, p_stage: s, p_date: date, p_note: note }, submitBtn(f));
    if (res) LW.done('Stage saved: ' + R.STAGE_LABEL[s]);
  };

  /* ---- meeting */
  R.actions['lead-meet'] = function (el) {
    var id = el.dataset.id, c = cur(id), at = c.P.meeting_at ? new Date(c.P.meeting_at) : null;
    if (at && isNaN(at)) at = null;
    var hw = c.P.meeting_how || 'In person';
    var how = ['In person', 'Video', 'Phone'].map(function (k) { return '<option' + (k === hw ? ' selected' : '') + '>' + k + '</option>'; }).join('');
    R.sheet('<form data-form="lead-meet" data-id="' + esc(id) + '" class="stack"><h2>' + (at ? 'Change the meeting' : 'Schedule a meeting') + '</h2><p class="muted small">With ' + esc(c.name) + '.</p>' +
      '<div class="row"><div class="field"><label for="lwMd">Date</label><input id="lwMd" name="date" type="date" value="' + (at ? ymd(at) : R.today()) + '"></div>' +
      '<div class="field"><label for="lwMt">Time</label><input id="lwMt" name="time" type="time" value="' + (at ? String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0') : '') + '"></div></div>' +
      '<div class="field"><label for="lwMh">How</label><select id="lwMh" name="how">' + how + '</select></div>' +
      '<div class="field"><label for="lwMn">Note</label><textarea id="lwMn" name="note" maxlength="1000">' + esc(c.P.meeting_note || '') + '</textarea></div>' +
      '<p class="small dim">This saves the meeting. It sends nothing to ' + esc(firstName(c.name) || 'them') + '. Set who tells them under Next.</p>' + sheetButtons('Save meeting') + '</form>');
  };
  R.forms['lead-meet'] = async function (f) {
    var date = val(f, 'date'), time = val(f, 'time');
    if (!date) { setErr(f, R.say('date_required')); return; }
    if (!time) { setErr(f, 'Pick a time.'); return; }
    var at = new Date(date + 'T' + time);
    if (isNaN(at)) { setErr(f, R.say('date_required')); return; }
    var res = await R.call('schedule_meeting', { p_person: f.dataset.id, p_at: at.toISOString(), p_how: val(f, 'how'), p_note: val(f, 'note') }, submitBtn(f));
    if (res) LW.done('Meeting saved');
  };

  /* ---- requirements */
  R.actions['lead-req'] = function (el) {
    var id = el.dataset.id, k = Number(el.dataset.req), on = el.dataset.on === '1', c = cur(id), label = R.REQ_LABEL[k];
    var head = '<form data-form="lead-req" data-id="' + esc(id) + '" data-req="' + k + '" data-on="' + (on ? 1 : 0) + '" class="stack">';
    if (!on) {
      R.sheet(head + '<h2>Untick “' + esc(label) + '”</h2><p class="muted">For ' + esc(c.name) + '. Before approval, this returns the Referral Reward to In progress until it is confirmed again.</p>' +
        '<div class="field"><label for="lwRqN">Reason</label><textarea id="lwRqN" name="note" maxlength="1000" autofocus></textarea></div>' + sheetButtons('Untick') + '</form>');
      return;
    }
    var others = reqRows(c.d).filter(function (r) { return r.req !== k && r.confirmed; }).length;
    R.sheet(head + '<h2>Confirm “' + esc(label) + '”</h2><p class="muted">For ' + esc(c.name) + '. It is saved as confirmed by ' + esc(me().name || 'you') + ' on the date below.</p>' +
      '<div class="field"><label for="lwRqD">Date it happened</label><input id="lwRqD" name="date" type="date" value="' + R.today() + '"></div>' +
      (k === 4 ? '<div class="field"><label for="lwRqS">Start date</label><input id="lwRqS" name="start" type="date" value="' + esc(c.P.start_date || '') + '"></div>' +
        '<div class="field"><label for="lwRqT">Travel plans</label><textarea id="lwRqT" name="travel" maxlength="1000" placeholder="Flight, drive or ride, and arrival day">' + esc(c.P.travel_na ? '' : (c.P.travel_note || '')) + '</textarea></div>' +
        '<label class="check-row"><input type="checkbox" name="na"' + (c.P.travel_na ? ' checked' : '') + '><span>Travel not needed (local start)</span></label>' : '') +
      '<div class="field"><label for="lwRqN">Note (optional)</label><textarea id="lwRqN" name="note" maxlength="1000"></textarea></div>' +
      (k === 4 || others === 3 ? '<p class="small dim">When all four are confirmed, the Referral Reward goes to review, credited to whoever signs them first: the first introduction recorded in the app and confirmed received.</p>' : '') +
      '<p class="err" data-err aria-live="polite"></p><div class="row"><button type="button" class="btn" data-a="sheet-close">Not yet</button><button type="submit" class="btn primary">Confirm</button></div></form>');
  };
  R.forms['lead-req'] = async function (f) {
    var id = f.dataset.id, k = Number(f.dataset.req), on = f.dataset.on === '1', note = val(f, 'note'), label = R.REQ_LABEL[k], res;
    if (on) {
      var date = val(f, 'date'), start = k === 4 ? val(f, 'start') : null, travel = k === 4 ? val(f, 'travel') : null, na = k === 4 ? checked(f, 'na') : null;
      if (!date) { setErr(f, R.say('date_required')); return; }
      if (k === 4 && !start) { setErr(f, R.say('start_date_required')); return; }
      if (k === 4 && !na && !travel) { setErr(f, R.say('travel_required')); return; }
      res = await R.call('set_requirement', { p_person: id, p_req: k, p_confirmed: true, p_event_date: date, p_note: note, p_start_date: start, p_travel_note: k === 4 ? (na ? '' : travel) : null, p_travel_na: na }, submitBtn(f));
    } else {
      if (!note) { setErr(f, R.say('reason_required')); return; }
      res = await R.call('set_requirement', { p_person: id, p_req: k, p_confirmed: false, p_event_date: null, p_note: note, p_start_date: null, p_travel_note: null, p_travel_na: null }, submitBtn(f));
    }
    if (!res) return;
    var rw = res.reward, all = arr(res.requirements).filter(function (r) { return r.confirmed; }).length === 4, msg = label + (on ? ' confirmed' : ' unticked');
    if (on && rw && rw.status === 'ready') msg = 'All four confirmed. The Referral Reward is ready for review' + (rw.rep_name ? ', credited to ' + rw.rep_name : '') + '.';
    else if (on && all && rw && arr(rw.flags).indexOf('no_intro') >= 0) msg = 'All four confirmed. No introduction is on record, so the owner decides.';
    LW.done(msg, on ? 'win' : null);
  };

  /* ---- outcome, interest, next action, notes, messages, introductions */
  var OUT_TEXT = {
    follow_up: function (n) { return 'Follow up later keeps ' + n + ' counted on the rep’s list. It shows under Follow-ups due on the date you pick.'; },
    not_interested: function (n) { return n + ' still counts toward the rep’s 100. It leaves the queues.'; },
    do_not_contact: function (n) { return 'Do not contact removes ' + n + ' from every rep’s count and from every queue. Only the owner can clear it.'; }
  };
  R.actions['lead-outcome'] = function (el) {
    var id = el.dataset.id, k = el.dataset.v, c = cur(id), nm = c.name;
    R.sheet('<form data-form="lead-outcome" data-id="' + esc(id) + '" data-v="' + esc(k) + '" class="stack"><h2>' + esc(R.OUTCOME_LABEL[k]) + '</h2><p class="muted">' + esc(OUT_TEXT[k](nm)) + '</p>' +
      (k === 'follow_up' ? '<div class="field"><label for="lwOd">Follow up on</label><input id="lwOd" name="date" type="date" min="' + R.today() + '"></div>' : '') +
      '<div class="field"><label for="lwOn">' + (k === 'not_interested' ? 'Reason' : 'Note (optional)') + '</label><textarea id="lwOn" name="note" maxlength="1000"></textarea></div>' +
      sheetButtons(k === 'do_not_contact' ? 'Set Do not contact' : 'Save', k === 'do_not_contact' ? 'danger' : 'primary') + '</form>');
  };
  R.forms['lead-outcome'] = async function (f) {
    var k = f.dataset.v, date = k === 'follow_up' ? val(f, 'date') : null, note = val(f, 'note');
    if (k === 'follow_up' && !date) { setErr(f, R.say('date_required')); return; }
    if (k === 'not_interested' && !note) { setErr(f, R.say('note_required')); return; }
    var res = await R.call('set_outcome', { p_person: f.dataset.id, p_outcome: k, p_date: date, p_note: note }, submitBtn(f));
    if (res) LW.done('Outcome saved: ' + R.OUTCOME_LABEL[k]);
  };
  R.actions['lead-outcome-clear'] = async function (el) {
    var res = await R.call('set_outcome', { p_person: el.dataset.id, p_outcome: null, p_date: null, p_note: '' }, el);
    if (res) LW.done('Outcome cleared');
  };
  R.actions['lead-interest'] = async function (el) {
    if (el.classList.contains('on')) return;
    var res = await R.call('set_interest', { p_person: el.dataset.id, p_interest: el.dataset.v }, el);
    if (res) LW.done('Interest: ' + R.INTEREST_LABEL[el.dataset.v]);
  };
  R.actions['lead-next'] = function (el) {
    var id = el.dataset.id, c = cur(id), P = c.P, opts = [], seen = {};
    function add(uid, label) { if (!uid || seen[uid]) return; seen[uid] = 1; opts.push('<option value="' + esc(uid) + '"' + (uid === (P.next_action_owner || me().id) ? ' selected' : '') + '>' + esc(label) + '</option>'); }
    add(me().id, (me().name || 'Me') + ' (you)');
    if (P.responsible_leader) add(P.responsible_leader, (P.responsible_leader_name || 'Responsible leader') + ' (leader)');
    arr(c.d.entries).forEach(function (e) { if (e.rep_id) add(e.rep_id, (e.rep_name || 'Rep') + ' (rep)'); });
    if (R.isOwner() && R.data.owner) arr(R.data.owner.leaders).forEach(function (l) { add(l.id, (l.name || 'Leader') + ' (leader)'); });
    if (P.next_action_owner) add(P.next_action_owner, personFor(P.next_action_owner, c.d, P) || 'Current');
    R.sheet('<form data-form="lead-next" data-id="' + esc(id) + '" class="stack"><h2>Next action</h2><p class="muted small">For ' + esc(c.name) + '. Name the person and what they do.</p>' +
      '<div class="field"><label for="lwNw">Who</label><select id="lwNw" name="who">' + opts.join('') + '</select></div>' +
      '<div class="field"><label for="lwNt">What happens next</label><input id="lwNt" name="text" maxlength="200" value="' + esc(P.next_action || '') + '" placeholder="Schedule the meeting" autofocus></div>' +
      '<div class="field"><label for="lwNd">By</label><input id="lwNd" name="date" type="date" value="' + esc(P.next_action_date || '') + '"></div>' + sheetButtons('Save next action') + '</form>');
  };
  R.forms['lead-next'] = async function (f) {
    var text = val(f, 'text');
    if (!text) { setErr(f, 'Say what happens next.'); return; }
    var res = await R.call('set_next_action', { p_person: f.dataset.id, p_text: text, p_owner: val(f, 'who') || null, p_date: val(f, 'date') || null }, submitBtn(f));
    if (res) LW.done('Next action saved');
  };
  R.forms['lead-note'] = async function (f) {
    var body = val(f, 'body');
    if (!body) { setErr(f, R.say('note_required')); return; }
    var res = await R.call('add_note', { p_person: f.dataset.id, p_body: body }, submitBtn(f));
    if (res) LW.done('Note added');
  };
  R.actions['lead-read'] = async function (el) {
    var res = await R.call('mark_messages_read', { p_person: el.dataset.id }, el);
    if (res) LW.done('Marked read');
  };
  R.actions['lead-intro-ok'] = async function (el) {
    var res = await R.call('confirm_intro_received', { p_person: el.dataset.id, p_rep: el.dataset.rep }, el);
    if (res) LW.done('Introduction received', 'win');
  };

  /* ---- reward review (also used from the rep walkthrough and the owner's Rewards page) */
  R.actions['lead-approve'] = function (el) {
    var ds = el.dataset, amt = ds.amount !== '' && ds.amount != null ? R.money(ds.amount) + ' ' : '';
    var extra = ds.kind === 'list' ? (ds.count ? ds.count + '/100 contacts complete. ' : '') + (ds.spot ? 'Spot-check: ' + (ds.spot === '1' ? 'done.' : 'not done.') : '') :
      ds.kind === 'referral' ? 'All four requirements are confirmed.' : '';
    R.sheet('<form data-form="lead-approve" data-id="' + esc(ds.id) + '" class="stack"><h2>Approve?</h2><p>Approve the ' + esc(amt + (ds.label || 'reward')) + '?</p>' +
      (extra ? '<p class="muted small">' + esc(extra) + '</p>' : '') + '<p class="small dim">After approval it shows as Pending pay until the owner marks pay issued.</p>' + sheetButtons('Approve', 'win') + '</form>');
  };
  R.forms['lead-approve'] = async function (f) {
    var res = await R.call('review_reward', { p_reward: f.dataset.id, p_action: 'approve', p_note: '' }, submitBtn(f));
    if (!res) return;
    var r = res.reward || {};
    R.closeSheet();
    R.celebrate({ stamp: true, title: 'Approved', sub: (LW.amt(r) ? LW.amt(r) + ' · ' : '') + 'Pending pay' });
    LW.refresh();
  };
  R.actions['lead-correct'] = function (el) {
    var ds = el.dataset;
    R.sheet('<form data-form="lead-correct" data-id="' + esc(ds.id) + '" class="stack"><h2>Needs correction</h2><p class="muted">' + esc(ds.label || 'This reward') + '</p>' +
      '<div class="field"><label for="lwCn">What needs fixing, and who fixes it?</label><textarea id="lwCn" name="note" maxlength="1000" autofocus placeholder="Marcus Lee’s phone is missing a digit. Rep: fix it."></textarea></div>' +
      '<p class="small dim">The rep sees this note. It stays at Needs correction until whoever raised it, or the owner, marks it resolved.</p>' + sheetButtons('Send back') + '</form>');
  };
  R.forms['lead-correct'] = async function (f) {
    var note = val(f, 'note');
    if (!note) { setErr(f, R.say('note_required')); return; }
    var res = await R.call('review_reward', { p_reward: f.dataset.id, p_action: 'needs_correction', p_note: note }, submitBtn(f));
    if (res) LW.done('Sent back: Needs correction');
  };
  R.actions['lead-resolve'] = function (el) {
    var ds = el.dataset;
    R.sheet('<form data-form="lead-resolve" data-id="' + esc(ds.id) + '" class="stack"><h2>Correction resolved?</h2><p class="muted">' + esc(ds.label || 'This reward') + ' goes back to Ready for review.</p>' +
      '<div class="field"><label for="lwRn">What was fixed (optional)</label><textarea id="lwRn" name="note" maxlength="1000"></textarea></div>' + sheetButtons('Resolved') + '</form>');
  };
  R.forms['lead-resolve'] = async function (f) {
    var res = await R.call('resolve_correction', { p_reward: f.dataset.id, p_note: val(f, 'note') }, submitBtn(f));
    if (res) LW.done('Back to Ready for review');
  };

  /* ======================================================================================================
     REPS
     ====================================================================================================== */
  LW.findRep = function (id) {
    var t = R.data.team && arr(R.data.team.reps).filter(function (r) { return r.id === id; })[0];
    var o = R.data.owner && arr(R.data.owner.reps).filter(function (r) { return r.id === id; })[0];
    return t || o || null;
  };
  LW.listRewardText = function (lr) {
    if (!lr) return '';
    return LW.statusText(lr) + (LW.reversed(lr) ? ' · Reversed' : '') + (lr.hold ? ' · On hold' : '');
  };
  function repsSorted(reps, key) {
    var out = reps.slice(), f = {
      name: function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); },
      count: function (a, b) { return (b.count || 0) - (a.count || 0); },
      last: function (a, b) { var x = String(a.last_activity || ''), y = String(b.last_activity || ''); return x < y ? 1 : x > y ? -1 : 0; }
    }[key] || null;
    return f ? out.sort(f) : out;
  }
  function repRows(reps) {
    if (!reps.length) return '<tr><td colspan="9" class="muted">No reps match.</td></tr>';
    var team = reps.some(function (r) { return r.team_name; }) && R.isOwner();
    return reps.map(function (r) {
      var c = r.count || 0, pct = Math.max(0, Math.min(100, c));
      return '<tr class="tap" data-a="lead-open-rep" data-id="' + esc(r.id) + '"><td><button class="link" data-a="lead-open-rep" data-id="' + esc(r.id) + '">' + esc(r.name || r.email || 'Rep') + '</button>' +
        (r.role && r.role !== 'rep' ? ' <span class="chip">' + esc(r.role === 'owner' ? 'Owner' : 'Leader') + '</span>' : '') + (r.disabled ? ' <span class="chip">Account off</span>' : '') + (r.closed ? ' <span class="chip">Closed</span>' : '') + '</td>' +
        (team ? '<td>' + esc(r.team_name || '') + '</td>' : '') +
        '<td class="nowrap"><b>' + c + '/100</b><span class="lw-mini" aria-hidden="true"><i style="width:' + pct + '%"></i></span></td>' +
        '<td>' + (r.drafts || 0) + '</td><td>' + (r.held || 0) + '</td><td class="nowrap">' + esc(r.last_activity ? R.date(r.last_activity) : '—') + '</td>' +
        '<td>' + esc(LW.listRewardText(r.list_reward) || '—') + '</td><td>' + (r.intros_received || 0) + '</td><td>' + (r.signed || 0) + '</td></tr>';
    }).join('');
  }
  /* team_state.reps carries no team name; the owner's copy of owner_state.reps does. */
  function teamReps() {
    var teams = {};
    if (R.isOwner() && R.data.owner) arr(R.data.owner.reps).forEach(function (r) { if (r.team_name) teams[r.id] = r.team_name; });
    return arr(R.data.team && R.data.team.reps).map(function (r) { return r.team_name || !teams[r.id] ? r : Object.assign({}, r, { team_name: teams[r.id] }); });
  }
  function repsFiltered() {
    var f = LW.cache().f, q = String(f.repQ || '').toLowerCase().trim(), reps = teamReps();
    if (q) reps = reps.filter(function (r) { return (String(r.name || '') + ' ' + String(r.email || '') + ' ' + String(r.team_name || '')).toLowerCase().indexOf(q) >= 0; });
    return repsSorted(reps, f.repSort || 'name');
  }
  function renderReps() {
    var d = R.data.team, head = '<div class="between"><h1>Reps</h1></div>';
    if (!d) return LW.wait(head);
    var reps = teamReps(), f = LW.cache().f, sort = f.repSort || 'name';
    var total = reps.reduce(function (s, r) { return s + (r.count || 0); }, 0);
    var team = reps.some(function (r) { return r.team_name; }) && R.isOwner();
    function th(k, label) { return '<th' + (k ? ' aria-sort="' + (sort === k ? (k === 'name' ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' + (k ? '<button class="lw-th" data-a="lead-rep-sort" data-k="' + k + '">' + label + (sort === k ? ' ↓' : '') + '</button>' : label) + '</th>'; }
    return LW.shell(head + LW.stale() + '<p class="muted">' + esc(R.plural(reps.length, 'rep') + ' · ' + total + ' counted contacts') + '</p>' +
      '<input class="search" type="search" id="lwRepQ" placeholder="Search reps by name or email" aria-label="Search reps" value="' + esc(f.repQ || '') + '">' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('name', 'Rep') + (team ? th('', 'Team') : '') + th('count', 'Count') + th('', 'Drafts') + th('', 'To check') + th('last', 'Last activity') +
      th('', 'List reward') + th('', 'Introductions') + th('', 'Signed') + '</tr></thead><tbody id="lwRepRows">' + repRows(repsFiltered()) + '</tbody></table></div>' +
      '<p class="small dim">Count is contacts complete out of 100. To check is possible duplicates the rep still has to sort out. Introductions are the ones a leader confirmed received.</p>');
  }
  R.screens['lead-reps'] = {
    mode: 'lead', wide: true,
    get nav() { return LW.nav(); },
    load: function () { return Promise.all([loadTeam(), R.isOwner() && !R.data.owner ? R.load('owner').catch(noop) : null]); },
    render: renderReps,
    after: function () {
      LW.visit();
      var q = document.getElementById('lwRepQ');
      if (q) q.addEventListener('input', function () { LW.cache().f.repQ = q.value; var tb = document.getElementById('lwRepRows'); if (tb) tb.innerHTML = repRows(repsFiltered()); });
    }
  };
  R.actions['lead-rep-sort'] = function (el) { LW.cache().f.repSort = el.dataset.k; R.render(); };

  /* ======================================================================================================
     REP WALKTHROUGH
     ====================================================================================================== */
  LW.incentives = function () {
    function pub(i) { return !i.status || i.status === 'published'; }
    var t = R.data.team && R.data.team.incentives; if (Array.isArray(t)) return t.filter(pub);
    if (R.isOwner()) { var o = R.data.owner && R.data.owner.incentives; return Array.isArray(o) ? o.filter(pub) : null; }
    var r = R.data.rep && R.data.rep.incentives; return Array.isArray(r) ? r.filter(pub) : null;
  };
  function loadRep(p) {
    var jobs = [loadTeam(), R.cloud.rpc('rep_list', { p_rep: p.id }).then(function (d) { LW.cache().reps[p.id] = d || {}; })];
    var t = R.data.team;
    if (R.isOwner()) { if (!R.data.owner) jobs.push(R.load('owner').catch(noop)); }
    else if (!(t && Array.isArray(t.incentives)) && !R.data.rep) jobs.push(R.load('rep').catch(noop));
    return Promise.all(jobs);
  }
  var SC = [['looks_real', 'Looks real'], ['unclear', 'Unclear'], ['not_real', 'Not real']];
  function entryState(e) {
    var c = [];
    if (e.removed) c.push('<span class="chip">Removed</span>');
    else if (e.dnc) c.push('<span class="chip alert">Do not contact</span>');
    else if (e.held_of) c.push('<span class="chip held">Possible duplicate' + (e.held_of_name ? ' of ' + esc(e.held_of_name) : '') + '</span>');
    else if (e.counted) c.push('<span class="chip win">Complete</span>');
    else c.push('<span class="chip draft">Draft' + (arr(e.missing).length ? ': needs ' + esc(arr(e.missing).join(', ')) : '') + '</span>');
    if (arr(e.kept_with).length) c.push('<span class="chip">Kept both</span>');
    if (e.verified_at) c.push('<span class="chip">Verified</span>');
    return c.join(' ');
  }
  var LF = [['all', 'All'], ['counted', 'Counted'], ['drafts', 'Drafts'], ['held', 'To check'], ['removed', 'Removed']];
  function entryFilter(k) {
    return {
      counted: function (e) { return e.counted; }, drafts: function (e) { return !e.counted && !e.removed && !e.held_of && !e.dnc; },
      held: function (e) { return !!e.held_of && !e.removed; }, removed: function (e) { return !!e.removed; }
    }[k] || function () { return true; };
  }
  /* The server draws the walkthrough sample once and keeps it until a spot-check uses it; only entries of
     that sample that still count can be recorded. */
  function sampleOf(L) { return arr(L && L.sample).filter(function (e) { return e && e.counted !== false; }); }
  function spotCard(lr, L, rep) {
    var sample = sampleOf(L), picks = LW.cache().sc[lr.id] || {}, who = firstName(rep.name) || 'the rep';
    var h = '<div class="lw-sec"><div class="between"><h3>Spot-check</h3><span class="chip">Spot-check: ' + (lr.spot_checked ? 'done' : 'not done') + '</span></div>' +
      '<p class="small muted">Together, in person: pick each contact below and ask ' + esc(who) + ' “How do you know them?”. Looks real marks the contact verified.</p>';
    if (!sample.length) return h + '<p class="empty">No complete contacts to sample yet.</p></div>';
    h += sample.map(function (e) {
      var nm = R.fullName(e) || 'Unnamed', bits = [R.fmtPhone(e.phone), LW.entryHandle(e), arr(e.tags).join(', ')].filter(Boolean).join(' · ');
      return '<div class="lw-sc"><div><b>' + esc(nm) + '</b>' + (bits ? '<div class="small muted">' + esc(bits) + '</div>' : '') + '<div class="small">How do you know ' + esc(firstName(nm) || 'them') + '?</div></div>' +
        '<div class="chips" role="group" aria-label="' + esc('Spot-check result for ' + nm) + '">' + SC.map(function (s) {
          var on = picks[e.id] === s[0];
          return '<button type="button" class="cbtn' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="lead-sc-pick" data-r="' + esc(lr.id) + '" data-e="' + esc(e.id) + '" data-v="' + s[0] + '">' + s[1] + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    return h + '<div class="field"><label for="lwScN">Spot-check note (optional)</label><input id="lwScN" maxlength="500" placeholder="No concerns"></div>' +
      '<p class="err" id="lwScErr" aria-live="polite"></p><div class="lw-btns"><button class="btn sm" data-a="lead-sc-save" data-r="' + esc(lr.id) + '" data-rep="' + esc(rep.id) + '">' + (lr.spot_checked ? 'Record a new spot-check' : 'Save spot-check') + '</button></div></div>';
  }
  function listRewardCard(rep, L) {
    var lr = rep.list_reward, count = L.count != null ? L.count : (rep.count || 0), self = rep.id === me().id;
    var h = '<section class="card"><div class="between"><h2>List Completion Reward</h2>' + (lr ? '<span class="chips">' + LW.statusChips(lr) + '</span>' : '') + '</div>';
    if (!lr) return h + '<p>' + esc(count + '/100 contacts complete.') + '</p><p class="small muted">The reward opens for review the first time the list reaches 100. Then you walk through the list and signed friends together, spot-check it here and approve.</p></section>';
    var s = lr.status, rev = LW.reversed(lr), r = Object.assign({ kind: 'list', rep_id: rep.id, rep_name: rep.name, count: count }, lr);
    if (rep.closed && arr(r.flags).indexOf('rep_closed') < 0) r.flags = arr(r.flags).concat('rep_closed');
    if ((s === 'approved' || s === 'paid') && !rev) {
      return h + '<div class="lw-paid"><img class="stamp" src="' + R.PANTHER + '" alt="Confirmed by RALLY"><div><b>' + esc((LW.amt(r) ? LW.amt(r) + ' · ' : '') + LW.statusText(r)) + '</b><div class="small muted">' + esc(count + '/100 contacts complete.') + '</div></div></div>' +
        (R.isOwner() && s === 'approved' && !rep.closed ? '<div class="lw-btns"><button class="btn sm" data-a="own-pay"' + LW.rattrs(r) + '>Mark pay issued</button></div>' : '') + '</section>';
    }
    if (rev) return h + '<p class="small muted">Reversed. Nothing more to do here.</p></section>';
    h += '<p>' + esc(count + '/100 contacts complete.') + (s === 'ready' ? ' Walk through ' + (firstName(rep.name) || 'the rep') + '’s list and signed friends together. Spot-check 3 to 5 contacts, then approve.' : '') + '</p>';
    if (lr.hold || count < 100) h += '<div class="banner"><span>' + esc('Count is ' + count + ' now. Approval opens once the list is back at 100. Nothing was lost.') + '</span></div>';
    if (s === 'needs_correction' && lr.correction_note) h += '<p class="small lw-msg">Needs correction: ' + esc(lr.correction_note) + '</p>';
    if (!self) h += spotCard(lr, L, rep);
    var b = '';
    if (rep.closed) h += '<p class="small muted">Rep closed: nothing is approved or paid for this rep until the owner reopens them.</p>';
    if (s === 'ready') {
      if (self) h += '<p class="small muted">' + esc(R.say('self_involved')) + '</p>';
      else b = (rep.closed ? '' : '<button class="btn sm win" data-a="lead-approve"' + LW.rattrs(r) + '>Approve</button>') + '<button class="btn sm" data-a="lead-correct"' + LW.rattrs(r) + '>Needs correction</button>';
    }
    if (s === 'needs_correction') b = '<button class="btn sm" data-a="lead-resolve"' + LW.rattrs(r) + '>Correction resolved</button>';
    return h + (b ? '<div class="lw-btns">' + b + '</div>' : '') + '</section>';
  }
  function renderRep(p) {
    var C = LW.cache(), L = C.reps[p.id], head = backLink(p, 'lead-reps');
    var rep = LW.findRep(p.id) || (L && L.rep) || { id: p.id };
    if (!L) return LW.wait(head + (rep.name ? '<h1>' + esc(rep.name) + '</h1>' : ''));
    rep = Object.assign({ id: p.id }, L.rep || {}, rep);
    var count = L.count != null ? L.count : (rep.count || 0), ents = arr(L.entries), self = rep.id === me().id;
    var stats = [['Contacts complete', count + '/100'], ['Drafts', rep.drafts || 0], ['To check', rep.held || 0], ['Introductions', rep.intros_received || 0], ['Signed', rep.signed || 0]];
    var reviews = arr(R.data.team && R.data.team.queues && R.data.team.queues.reviews).filter(function (r) { return r.rep_id === rep.id && r.kind !== 'list'; });
    var incs = LW.incentives(), award = '';
    if (self) award = '<p class="small muted">You can’t award an incentive to yourself.</p>';
    else if (rep.closed) award = '<p class="small muted">Rep closed: no new awards until the owner reopens this rep.</p>';
    else if (incs === null) award = '<p class="small muted">Published incentives aren’t available here yet.</p>';
    else if (!incs.length) award = '<p class="small muted">No incentives are published.' + (R.isOwner() ? ' Add one under Incentives.' : '') + '</p>';
    else award = '<p class="small muted">' + esc(R.plural(incs.length, 'published incentive')) + '. The award is recorded as Pending pay until the owner marks pay issued.</p><div class="lw-btns"><button class="btn sm" data-a="lead-award" data-rep="' + esc(rep.id) + '" data-name="' + esc(rep.name || '') + '">Award an incentive</button></div>';
    var right = (reviews.length ? '<section class="card"><h2>Rewards waiting for review</h2><div class="queue">' + reviews.map(reviewItem).join('') + '</div></section>' : '') +
      '<section class="card"><h2>Award an incentive</h2>' + award + '</section>' +
      (R.isOwner() && !self ? '<section class="card"><div class="between"><h2>Rep left or didn’t come out</h2>' + (rep.closed ? '<span class="chip">Closed</span>' : '') + '</div>' +
        '<p class="small muted">' + (rep.closed ? 'This rep is closed: nothing new is approved, awarded or paid for them. Reopening ends that for the future; it does not undo past closures.'
          : 'Closes every reward of this rep that isn’t paid yet as not paid. Pay already issued stays. Internal only.') + '</p>' +
        '<div class="lw-btns"><button class="btn sm danger" data-a="own-close-unpaid" data-rep="' + esc(rep.id) + '" data-name="' + esc(rep.name || '') + '">Close unpaid rewards (rep left or didn’t come out)</button>' +
        (rep.closed ? '<button class="btn sm" data-a="own-reopen" data-rep="' + esc(rep.id) + '" data-name="' + esc(rep.name || '') + '">Reopen</button>' : '') + '</div></section>' : '');
    var f = C.f.listF || 'all', shown = ents.filter(entryFilter(f)).sort(function (a, b) { return R.fullName(a).localeCompare(R.fullName(b)); });
    var tabs = LF.map(function (t) { var n = ents.filter(entryFilter(t[0])).length; return '<button class="cbtn' + (t[0] === f ? ' on' : '') + '" aria-pressed="' + (t[0] === f) + '" data-a="lead-list-f" data-k="' + t[0] + '">' + t[1] + ' ' + n + '</button>'; }).join('');
    var rows = shown.length ? shown.map(function (e) {
      var a = e.person_id ? ' class="tap" data-a="lead-open-person" data-id="' + esc(e.person_id) + '"' : '';
      return '<tr' + a + '><td>' + (e.person_id ? '<button class="link" data-a="lead-open-person" data-id="' + esc(e.person_id) + '">' + esc(R.fullName(e) || 'Unnamed') + '</button>' : esc(R.fullName(e) || 'Unnamed')) + '</td>' +
        '<td class="nowrap">' + esc(R.fmtPhone(e.phone) || '—') + '</td><td>' + esc(LW.entryHandle(e) || '—') + '</td><td>' + esc(arr(e.tags).join(', ')) + '</td><td>' + entryState(e) + '</td><td class="nowrap">' + esc(R.date(e.created_at)) + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="muted">Nothing here.</td></tr>';
    var sub = [count + '/100 contacts complete', R.plural(rep.drafts || 0, 'draft'), (rep.held || 0) + ' to check', rep.last_activity ? 'last activity ' + R.date(rep.last_activity) : ''].filter(Boolean).join(' · ');
    return LW.shell(head + LW.stale() + '<div class="lw-head"><h1>' + esc(rep.name || 'Rep') + '</h1>' + (rep.closed ? '<div class="chips"><span class="chip">Closed</span></div>' : '') + '<p class="muted">' + esc(sub) + '</p></div>' +
      '<div class="stats">' + stats.map(function (s) { return '<div class="stat"><b>' + esc(s[1]) + '</b><span>' + esc(s[0]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="cols two"><div class="stack lw-col">' + listRewardCard(rep, L) + '</div><div class="stack lw-col">' + right + '</div></div>' +
      '<section class="card"><div class="between"><h2>' + esc((firstName(rep.name) || 'Rep') + '’s list') + '</h2></div><div class="chips">' + tabs + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Social</th><th>Tags</th><th>State</th><th>Added</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>');
  }
  R.screens['lead-rep'] = {
    mode: 'lead', wide: true,
    get nav() { return LW.nav(); },
    get tab() { return tabFor((R.view.p || {}).from, 'lead-reps'); },
    load: loadRep,
    render: renderRep,
    after: function () { LW.visit(); }
  };
  R.actions['lead-list-f'] = function (el) { LW.cache().f.listF = el.dataset.k; R.render(); };
  R.actions['lead-sc-pick'] = function (el) {
    var C = LW.cache(), picks = C.sc[el.dataset.r] || (C.sc[el.dataset.r] = {});
    picks[el.dataset.e] = el.dataset.v;
    var grp = el.parentNode; Array.prototype.forEach.call(grp.querySelectorAll('.cbtn'), function (b) { var on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    var e = document.getElementById('lwScErr'); if (e) e.textContent = '';
  };
  R.actions['lead-sc-save'] = async function (el) {
    var C = LW.cache(), rid = el.dataset.r, L = C.reps[el.dataset.rep] || {}, picks = C.sc[rid] || {}, err = document.getElementById('lwScErr');
    var sample = sampleOf(L), missing = sample.filter(function (e) { return !picks[e.id]; });
    if (!sample.length) return;
    if (missing.length) { if (err) err.textContent = 'Mark every contact: Looks real, Unclear or Not real.'; return; }
    var note = (document.getElementById('lwScN') || {}).value || '';
    var res = await R.call('record_spot_check', { p_reward: rid, p_results: sample.map(function (e) { return { entry_id: e.id, result: picks[e.id] }; }), p_note: note.trim() }, el);
    if (!res) return;
    delete C.sc[rid];
    LW.done('Spot-check saved');
  };
  R.actions['lead-award'] = function (el) {
    var incs = LW.incentives() || [];
    if (!incs.length) return;
    var opts = incs.map(function (i) { return '<option value="' + esc(i.id) + '">' + esc((i.name || 'Incentive') + ' · ' + R.money(i.prize_cents)) + '</option>'; }).join('');
    R.sheet('<form data-form="lead-award" data-rep="' + esc(el.dataset.rep) + '" data-request="' + esc(R.uuid()) + '" class="stack"><h2>Award an incentive</h2><p class="muted">To ' + esc(el.dataset.name || 'this rep') + '. It is recorded as approved and shows as Pending pay until the owner marks pay issued.</p>' +
      '<div class="field"><label for="lwAi">Incentive</label><select id="lwAi" name="inc">' + opts + '</select></div>' +
      '<div class="field"><label for="lwAn">Why it was earned</label><textarea id="lwAn" name="note" maxlength="1000"></textarea></div>' +
      '<p class="small dim">Awarding the same incentive again makes a second award.</p>' + sheetButtons('Award', 'win') + '</form>');
  };
  R.forms['lead-award'] = async function (f) {
    var note = val(f, 'note');
    if (!note) { setErr(f, R.say('note_required')); return; }
    var res = await R.call('award_incentive', { p_incentive: val(f, 'inc'), p_rep: f.dataset.rep, p_note: note, p_request: f.dataset.request }, submitBtn(f));
    if (res) LW.done('Awarded. It shows as Pending pay.', 'win');
  };
})();
