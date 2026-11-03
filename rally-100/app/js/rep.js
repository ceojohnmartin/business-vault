/* RALLY 100: rep screens. Onboarding, Home (the Wall), Scenes, the drop-in, the 60-second Sprint, the Sweep,
   the contact form, My Network, the Intro Board, one introduction, My Rewards and the congratulations screen.

   Data: rep_state arrives through R100.load('rep') into R100.data.rep. List writes (save_entry) go only through
   R100.outbox; the entry is updated on the phone at once (flag _pending, so its tile shows the syncing dot) and
   the server's answer is merged by the one onDone handler below, which also plays the server's effects. Every
   other write is an R100.call followed by a fresh rep_state. Counts, XP, milestones and reward statuses are always
   the server's; this file never works out money or eligibility. Every server or user string goes through R.esc. */
(function () {
  'use strict';
  var R = window.R100;
  var esc = R.esc;
  var ACK_VERSION = 1;                    /* the wording on onboarding card 4 is disclosure version 1 */
  var STALE_MS = 20000;
  var DATA_SCREENS = { home: 1, scenes: 1, network: 1, intros: 1, intro: 1, rewards: 1, dropin: 1 };
  var BADGES = [['reader', 'Scene Reader', '3 Scenes cleared'], ['sprinter', 'Sprinter', '10 names in one Sprint'], ['clean_sweep', 'Clean Sweep', '20 drafts finished in one Sweep'],
    ['full', 'Full Wall', '100 contacts complete'], ['first_intro', 'First Intro', 'First introduction received'], ['matchmaker', 'Matchmaker', '3 introductions received']];
  var BADGE_NAME = {};
  BADGES.forEach(function (b) { BADGE_NAME[b[0]] = b[1]; });
  var HOW = [['text', 'Text'], ['call', 'Call'], ['in_person', 'In person'], ['other', 'Other']];
  var SAID = [['in', 'In'], ['maybe', 'Maybe'], ['not_for_them', 'Not for them'], ['didnt_say', 'Didn’t really say']];
  var HOSTS = [[/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)snapchat\.com$/, 'Snapchat'], [/(^|\.)tiktok\.com$/, 'TikTok'], [/(^|\.)(facebook\.com|fb\.com)$/, 'Facebook'],
    [/(^|\.)(x\.com|twitter\.com)$/, 'X'], [/(^|\.)linkedin\.com$/, 'LinkedIn'], [/(^|\.)(discord\.com|discord\.gg)$/, 'Discord']];
  var fx = { done: {}, drafted: {} };      /* tiles to animate on their next draw: green sweep, draft pop-in */
  var dirty = false;                       /* a write happened since the last rep_state */

  /* ============================================================ data helpers ============================== */
  function D() { return R.data.rep; }
  function all() { var d = D(); return (d && d.entries) || []; }
  function byId(id) { var a = all(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function ts(v) { var t = v ? Date.parse(v) : NaN; return isNaN(t) ? 0 : t; }
  function trim(s) { return String(s == null ? '' : s).trim(); }
  function uid() { var s = R.cloud && R.cloud.session ? R.cloud.session() : null; return (s && s.userId) || (R.data.me && R.data.me.user && R.data.me.user.id) || 'me'; }
  function key(k) { return 'r100_' + k + '_' + uid(); }
  function nameOf(e) { return (e && (R.fullName(e) || trim(e.name))) || 'This contact'; }
  function firstOf(e) { return (e && (trim(e.first_name) || trim(e.name).split(' ')[0])) || 'them'; }
  function complete(e) { return !!trim(e.first_name) && R.missing(e).length === 0; }
  function missingOf(e) { return (!e._pending && Array.isArray(e.missing)) ? e.missing : R.missing(e); }
  function gone(e) { return !!(e.removed || e.merged_into); }
  function lit(e) { if (gone(e)) return false; return e._pending ? (complete(e) && !e.held_of && !e.dnc) : !!e.counted; }
  function held(e) { return !gone(e) && !!e.held_of; }
  function isDraft(e) { return !gone(e) && !e.held_of && !e.dnc && !(e._pending ? complete(e) : e.is_complete); }
  function byCreated(a, b) { return ts(a.created_at) - ts(b.created_at); }
  function live() { return all().filter(function (e) { return !gone(e); }); }
  function draftList() { return live().filter(isDraft).sort(byCreated); }
  function heldList() { return live().filter(held).sort(byCreated); }
  function litList() {
    return live().filter(lit).sort(function (a, b) { return (ts(a.completed_at) || 9e15) - (ts(b.completed_at) || 9e15) || byCreated(a, b); });
  }
  function nextMs(c) { for (var i = 0; i < R.MS.length; i++) if (R.MS[i] > c) return R.MS[i]; return null; }
  function hasMs(n) { var d = D(); return !!(d && (d.milestones || []).indexOf(n) >= 0); }
  function cleanHandle(s) {
    var v = trim(s).replace(/^https?:\/\//i, '');
    var m = /^(?:www\.)?([^\/\s]+)\/(.*)$/.exec(v);
    if (m && /\./.test(m[1]) && HOSTS.some(function (h) { return h[0].test(m[1].toLowerCase()); })) v = m[2];
    return R.normHandle(v);
  }
  function handleKey(e) { var h = R.normHandle(e.handle); if (!h || !e.platform) return null; return e.platform + ':' + (e.platform === 'Other' ? trim(e.other_app).toLowerCase() + ':' : '') + h; }
  function sameKey(a, b) { var hk = handleKey(a); return (R.phoneOk(a.phone) && a.phone === b.phone) || (!!hk && hk === handleKey(b)); }
  function repScreen() { var s = R.screens[R.view.name]; return !!(s && s.mode === 'rep'); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function sentence(s) { s = trim(s); return s && !/[.!?]$/.test(s) ? s + '.' : s; }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function setText(id, t) { var el = document.getElementById(id); if (el) el.textContent = t || ''; }
  function amount(r) { return R.money(r && r.amount_cents != null ? r.amount_cents : 10000); }   /* list and referral rewards are $100 by rule */
  function stampImg() { return '<img class="stamp" src="' + R.PANTHER + '" alt="RALLY panther stamp">'; }
  function coverOf(x) {
    var p = x && Array.isArray(x.pictures) ? x.pictures[0] : null;
    return (typeof p === 'string' && /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+\/=\s]+$/.test(p)) ? p : '';
  }

  /* intros */
  function introList() { var d = D(); return ((d && d.intros) || []).filter(Boolean); }
  function introFor(id) { var a = introList(); for (var i = 0; i < a.length; i++) if (a[i].entry_id === id) return a[i]; return null; }
  function introByPerson(pid) { var a = introList(); for (var i = 0; i < a.length; i++) if (pid && a[i].person_id === pid) return a[i]; return null; }
  function myIntro(i) { return !!(i && (i.status === 'planned' || i.status === 'introduced')); }
  function onBoard(i) { return !!(i && (myIntro(i) || i.outcome)); }
  /* on the board, the next move is the rep's, and a follow-up is due (Follow up later waits for its date) */
  function waiting() {
    return introList().filter(function (i) { return onBoard(i) && i.next && i.next.who === 'you' && !(i.outcome === 'follow_up' && i.outcome_date && i.outcome_date > R.today()); });
  }
  function readyList() {
    return live().filter(function (e) { return lit(e) && !e.dnc && !onBoard(introFor(e.id)); })
      .sort(function (a, b) { return ts(b.completed_at) - ts(a.completed_at); });
  }
  function leaderName(i) { var d = D(); return trim(i && i.leader_name) || trim(d && d.leader && d.leader.name); }
  function reqOf(list, n) { for (var i = 0; i < (list || []).length; i++) if (Number(list[i].req) === n) return list[i]; return null; }
  function confirmedCount(x) {
    if (x && x.confirmed_count != null) return x.confirmed_count;
    return ((x && x.requirements) || []).filter(function (r) { return r.confirmed; }).length;
  }
  function hasReqs(i) { return !!(i && Array.isArray(i.requirements) && i.requirements.length); }
  /* once the referral is credited to another rep, this rep sees that line only: never the Person's later
     stage, checks or status (blueprint, "Who sees a referral row"); rep_state names such rows by name only */
  function creditedElsewhere(i) {
    var d = D(), n = trim(i && i.name).toLowerCase();
    return !!(n && d && d.referrals.some(function (x) { return x && x.credited === 'other' && trim(x.name).toLowerCase() === n; }));
  }
  function otherLine(i) { var f = firstOf(i); return 'Another rep who also knows ' + f + ' introduced them first, so the referral reward goes to them. ' + f + ' still counts toward your 100. Questions? Ask your leader.'; }
  function dncLine(f) { return 'Do not contact. The RALLY team won’t reach out to ' + f + ', so they no longer count toward your 100.'; }

  /* scene progress: the server's numbers, worked out from the entries only while this phone has changes the server
     has not reported in a fresh rep_state yet */
  function sceneStats(sid) {
    var d = D(), s = (d && d.scenes && d.scenes[sid]) || {};
    var mine = all().filter(function (e) { return e.scene === sid && !e.merged_into; });
    var touched = mine.some(function (e) { return e._local || e._pending || e._acked; });
    if (!touched) return { names: s.names || 0, lit: s.lit || 0, drafts: s.drafts || 0, cleared: !!s.cleared };
    var on = mine.filter(function (e) { return !e.removed; });
    return { names: on.length, lit: on.filter(lit).length, drafts: on.filter(isDraft).length, cleared: !!s.cleared };
  }
  function lastScene() {
    var s = R.store.get(key('last_scene'), null);
    if (s && R.scene(s)) return s;
    var a = all().filter(function (e) { return e.scene && R.scene(e.scene); }).sort(byCreated);
    return a.length ? a[a.length - 1].scene : null;
  }

  /* ============================================================ load, overlay, refresh ===================== */
  var loading = null, again = false, lastTry = 0, failed = false, reloadTimer = null;
  function skeleton() {
    return { count: 0, drafts: 0, held: 0, xp: 0, level: R.level(0), milestones: [], badges: [], scenes: {}, entries: [], list_reward: null,
      referrals: [], intros: [], incentives: [], awards: [], leader: null, _skeleton: true };
  }
  function normalize(d) {
    ['milestones', 'badges', 'entries', 'referrals', 'intros', 'incentives', 'awards'].forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    if (!d.scenes || typeof d.scenes !== 'object') d.scenes = {};
    ['count', 'drafts', 'held', 'xp'].forEach(function (k) { d[k] = Number(d[k]) || 0; });
    if (!d.level) d.level = R.level(d.xp);
    return d;
  }
  /* names typed without signal wait in the outbox; show them on the Wall until the server has them */
  function outboxItems() { return R.outbox.items(); }
  function overlay(d) { outboxItems().forEach(function (it) { if (it && it.p && it.p.id) localApply(it.p, d); }); }
  function load() {
    if (loading) { again = true; return loading; }
    lastTry = Date.now(); dirty = false;
    var prev = D();
    loading = R.load('rep').then(function (d) {
      if (!d || typeof d !== 'object') throw new Error('rep_state');
      failed = false;
      normalize(d); overlay(d); noticeChanges(prev, d); rewardMoments(d); badgeRetry();
      return true;
    }).catch(function (e) {
      failed = true;
      if (e && e.kind === 'auth') { R.handleError(e); return false; }
      if (e && !e.kind) console.error(e);
      if (!R.data.rep || typeof R.data.rep !== 'object') { R.data.rep = skeleton(); overlay(R.data.rep); }
      else normalize(R.data.rep);
      return false;
    }).then(function (ok) {
      loading = null;
      try { setNavBadge(); } catch (x) {}
      if (again) { again = false; return load(); }
      return ok;
    });
    return loading;
  }
  function ensure(force) {
    var d = D(), age = Date.now() - (R.data.repAt || 0);
    if (!force && d && !d._skeleton && !dirty && age <= STALE_MS) return;
    if (!force && d && !d._skeleton && R.outbox.count() && age < 60000) return;     /* let the outbox drain first */
    if (!force && failed && Date.now() - lastTry < 8000) return;                     /* no signal: don't hammer */
    load().then(function () { refreshView(); });
  }
  function reloadSoon() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      if (DATA_SCREENS[R.view.name] && !R.outbox.count()) load().then(function () { refreshView(); });
    }, 700);
  }
  /* re-draw what the current screen shows, never wiping what the rep is typing */
  function refreshView() {
    var n = R.view.name, s = R.screens[n];
    if (!s || s.mode !== 'rep') return;
    if (n === 'sprint') { spUpdate(); return; }
    if (n === 'sweep' || n === 'contact') { formRefresh(); return; }
    if (n === 'network' && document.getElementById('netList')) { netRefresh(); return; }
    if (n === 'congrats' || n === 'onboarding') return;
    R.render();
  }
  function setNavBadge() { var w = waiting().length; R.navBadges.intros = w || 0; }
  /* The prototype's two money moments, played once per reward when the server says so: the stamp presses on at
     Pending pay, a green check at Pay issued. Remembered per account so they never replay; a first load on a
     new phone only records what is already there. Never at Ready for review. */
  function rewardMoments(d) {
    var k = key('seen_rewards'), seen = R.store.get(k, null), next = {}, quiet = !seen || !repScreen();
    function look(id, r, label, amt) {
      if (!r || r.reversed || !r.status) return;
      next[id] = r.status;
      var was = seen && seen[id];
      if (quiet) return;
      if (r.status === 'approved' && was !== 'approved' && was !== 'paid') R.celebrate({ stamp: true, title: 'Approved by your leader', sub: label + ' · ' + amt + ' · Pending pay' });
      else if (r.status === 'paid' && was !== 'paid') R.celebrate({ check: true, title: 'Pay issued', sub: label + ' · ' + R.date(r.paid_on) });
    }
    look('list', d.list_reward, 'List reward', amount(d.list_reward));
    d.referrals.forEach(function (x) { if (x.credited === 'me') look('ref:' + x.person_id, x, trim(x.name) || 'Referral reward', amount(x)); });
    d.awards.forEach(function (a) { look('award:' + a.id, a, trim(a.name) || 'Incentive', R.money(a.amount_cents)); });
    R.store.set(k, next);
  }
  function noticeChanges(prev, d) {
    if (!prev || prev._skeleton || !repScreen()) return;
    var had = prev.badges || [];
    (d.badges || []).forEach(function (b) { if (had.indexOf(b) < 0 && BADGE_NAME[b]) R.toast('Badge: ' + BADGE_NAME[b], 'win'); });
    if (prev.level && d.level && d.level.name !== prev.level.name && d.xp > (prev.xp || 0)) R.celebrate({ title: 'Level up: ' + d.level.name, sub: d.xp + ' XP' });
    var was = {};
    (prev.intros || []).forEach(function (i) { was[i.entry_id] = i; });
    (d.intros || []).forEach(function (i) { var o = was[i.entry_id]; if (o && !o.received && i.received) R.toast('+100 XP · Introduction received'); });
  }

  /* ============================================================ the phone's copy of an entry =============== */
  var FIELDS = ['first_name', 'last_name', 'phone', 'handle', 'platform', 'other_app', 'tags', 'notes', 'scene', 'chain_hit'];
  function localDup(e, d) {
    var ph = R.phoneOk(e.phone) ? e.phone : null, hk = handleKey(e);
    if (!ph && !hk) return null;
    var kept = e.kept_with || [], found = null;
    d.entries.forEach(function (o) {
      if (found || o.id === e.id || gone(o) || o.held_of) return;
      if (kept.indexOf(o.id) >= 0 || (o.kept_with || []).indexOf(e.id) >= 0) return;
      if (!((ph && o.phone === ph) || (hk && handleKey(o) === hk))) return;
      if (ts(o.created_at) <= ts(e.created_at)) found = o;           /* the newer entry is the one held */
    });
    return found;
  }
  function localApply(p, d) {
    d = d || D();
    if (!d) return null;
    var e = null;
    for (var i = 0; i < d.entries.length; i++) if (d.entries[i].id === p.id) { e = d.entries[i]; break; }
    if (!e) {
      e = { id: p.id, first_name: '', last_name: '', phone: '', handle: '', platform: '', other_app: '', tags: [], notes: '', scene: null, chain_hit: false,
        is_complete: false, counted: false, held_of: null, held_of_name: null, kept_with: [], removed: false, merged_into: null,
        created_at: new Date().toISOString(), completed_at: null, missing: [], person_id: null, dnc: false, _local: true };
      d.entries.push(e);
    }
    FIELDS.forEach(function (k) { if (p[k] !== undefined) e[k] = p[k]; });
    e._pending = true;
    if (e.held_of) {
      var o = null;
      for (var j = 0; j < d.entries.length; j++) if (d.entries[j].id === e.held_of) o = d.entries[j];
      if (!o || gone(o) || !sameKey(e, o)) { e.held_of = null; e.held_of_name = null; }
    }
    if (!e.held_of) {
      var dup = localDup(e, d);
      if (dup) { e.held_of = dup.id; e.held_of_name = R.fullName(dup); e._heldBy = (R.phoneOk(e.phone) && e.phone === dup.phone) ? 'phone' : 'handle'; }
    }
    e.missing = R.missing(e);
    e.is_complete = complete(e);
    if (lit(e) && !e.completed_at) e.completed_at = new Date().toISOString();
    return e;
  }
  function pendingItem(id) { var a = outboxItems(); for (var i = 0; i < a.length; i++) if (a[i] && a[i].p && a[i].p.id === id) return a[i].p; return null; }
  function mergeEntry(se) {
    var d = D();
    if (!d || !se || !se.id) return;
    var i = -1;
    for (var k = 0; k < d.entries.length; k++) if (d.entries[k].id === se.id) { i = k; break; }
    if (se.merged_into) { if (i >= 0) d.entries.splice(i, 1); return; }
    var old = i >= 0 ? d.entries[i] : null, ne = Object.assign({}, se);
    if (old && old._local) ne._local = true;
    if (old && old._heldBy && se.held_of) ne._heldBy = old._heldBy;
    ne._acked = true;
    if (i >= 0) d.entries[i] = ne; else d.entries.push(ne);
    if (R.outbox.pending(se.id)) { var p = pendingItem(se.id); if (p) localApply(p, d); }
  }
  function mergeIntro(intro) {
    var d = D();
    if (!d || !intro || !intro.entry_id) return;
    for (var i = 0; i < d.intros.length; i++) if (d.intros[i].entry_id === intro.entry_id) { d.intros[i] = intro; return; }
    d.intros.push(intro);
  }
  function applyResult(res) {
    var d = D();
    if (!res) return;
    if (d) {
      if (res.entry) mergeEntry(res.entry);
      ['count', 'drafts', 'held', 'xp'].forEach(function (k) { if (res[k] != null) d[k] = Number(res[k]) || 0; });
      if (res.level) d.level = res.level;
    }
    runEffects(res.effects || [], res);
  }

  /* ============================================================ effects and celebrations =================== */
  var xpSum = 0, xpTimer = null;
  function xpToast(n) {
    xpSum += Number(n) || 0;
    clearTimeout(xpTimer);
    xpTimer = setTimeout(function () { if (xpSum) R.toast('+' + xpSum + ' XP'); xpSum = 0; }, 350);
  }
  function runEffects(list, res) {
    if (!list || !list.length) return;
    var d = D(), show = repScreen(), ready = false, hundred = false;
    list.forEach(function (f) {
      if (!f || !f.type) return;
      if (f.type === 'xp') {
        if (show && !/^(sc|ms):/.test(String(f.key || ''))) xpToast(f.points);   /* scene and milestone XP ride on their celebration */
      } else if (f.type === 'milestone') {
        var n = Number(f.n);
        if (d && d.milestones.indexOf(n) < 0) d.milestones.push(n);
        if (n >= 100) hundred = true;
        else if (show && R.MS_TEXT[n]) R.celebrate({ stamp: n === 10, title: R.MS_TEXT[n][0], sub: R.MS_TEXT[n][1] + ' +' + (R.MS_XP[n] || 0) + ' XP' });
      } else if (f.type === 'scene_cleared') {
        var sc = R.scene(f.scene);
        if (d) d.scenes[f.scene] = Object.assign({}, d.scenes[f.scene] || {}, { cleared: true });
        if (show) R.celebrate({ check: true, title: 'Scene cleared', sub: (sc ? sc.name : 'Scene') + ' · +15 XP' });
      } else if (f.type === 'level') {
        if (show) R.celebrate({ title: 'Level up: ' + f.name, sub: res && res.xp != null ? res.xp + ' XP' : '' });
      } else if (f.type === 'held') {
        var e = res && res.entry ? byId(res.entry.id) : null;
        if (e) e._heldBy = f.by;
        if (show) R.toast((f.older_name || 'This contact') + ' might already be on your Wall' + (SAME[f.by] || '') + '.');
      } else if (f.type === 'list_ready') ready = true;
    });
    if (hundred && show && !ready) R.celebrate({ stamp: true, title: R.MS_TEXT[100][0], sub: R.MS_TEXT[100][1] + ' +' + R.MS_XP[100] + ' XP' });
    if (ready && show) { R.closeSheet(); R.go('congrats', { fresh: true }); }
  }

  /* ONE outbox listener for the whole app session: the server's answer to each save_entry */
  R.outbox.onDone(function (res, p, err) {
    var d = D();
    if (loading) again = true;
    if (err) {
      if (d && p) {
        var e = byId(p.id);
        if (e && e._local && !e._acked) d.entries.splice(d.entries.indexOf(e), 1);    /* the server never had it */
        else if (e) e._pending = R.outbox.pending(e.id);
      }
      dirty = true; R.data.repAt = 0;
      refreshView();
      if (!R.outbox.count()) reloadSoon();
      return;
    }
    if (!res) return;
    applyResult(res);
    dirty = true;
    refreshView();
    if (!R.outbox.count()) reloadSoon();
  });
  window.addEventListener('online', function () { if (repScreen() && !loading) ensure(true); badgeRetry(); });
  window.addEventListener('online', syncNoteUpdate);
  window.addEventListener('offline', syncNoteUpdate);
  document.addEventListener('visibilitychange', function () {
    if (sp && R.view.name === 'sprint' && sp.left != null && !sp.ended) {
      if (document.hidden) sp.paused = true;
      else if (sp.paused) { sp.paused = false; setText('spSaved', 'Timer paused while you were away'); }
    }
    if (!document.hidden && DATA_SCREENS[R.view.name]) ensure();
  });

  /* badges the phone reports (sprinter, clean_sweep); the server keeps them idempotent */
  var badgeWant = {}, badgeBusy = {};
  function awardBadge(b) {
    var d = D();
    if ((d && !d._skeleton && d.badges.indexOf(b) >= 0) || badgeWant[b]) return;
    badgeWant[b] = uid();
    badgeRetry();
  }
  function badgeRetry() {
    Object.keys(badgeWant).forEach(function (b) {
      var d = D();
      if (badgeWant[b] !== uid() || (d && !d._skeleton && d.badges.indexOf(b) >= 0)) { delete badgeWant[b]; return; }
      if (badgeBusy[b] || !navigator.onLine) return;
      badgeBusy[b] = true;
      R.call('award_badge', { p_badge: b }).then(function (res) {
        badgeBusy[b] = false;
        if (!res) return;
        delete badgeWant[b];
        var d2 = D(), had = !!(d2 && d2.badges.indexOf(b) >= 0);
        if (d2 && Array.isArray(res.badges)) d2.badges = res.badges;
        dirty = true;
        if (!had) R.toast('Badge: ' + BADGE_NAME[b], 'win');
        reloadSoon();
      });
    });
  }

  /* waits for an entry's queued save to reach the server before a write that needs the server to know it */
  function whenSynced(id) {
    return new Promise(function (resolve) {
      if (!R.outbox.pending(id)) { resolve(true); return; }
      R.outbox.flush();
      var t0 = Date.now();
      (function poll() {
        if (!R.outbox.pending(id)) resolve(true);
        else if (Date.now() - t0 > 6000) resolve(false);
        else setTimeout(poll, 150);
      })();
    });
  }

  /* focus survives a re-render (the core re-draws the screen when the phone goes on or off line) */
  document.addEventListener('focusin', function (ev) {
    var t = ev.target, app = document.getElementById('app');
    if (!t || !t.id || !/^(INPUT|TEXTAREA)$/.test(t.tagName) || !app || !app.contains(t) || !R.view.p) return;
    R.view.p._focus = t.id;
  });
  document.addEventListener('focusout', function (ev) {
    var t = ev.target, p = R.view.p;
    if (!t || !t.id || !p || p._focus !== t.id) return;
    setTimeout(function () {
      var el = document.getElementById(t.id);
      if (R.view.p === p && el && document.activeElement !== el) p._focus = null;
    }, 0);
  });
  /* the Wall and the reward strip are tappable blocks; Enter or Space works on them too */
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if ((ev.key === 'Enter' || ev.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.a && t.tagName !== 'BUTTON') { ev.preventDefault(); t.click(); }
  });
  function restoreFocus(p) {
    if (!p || !p._focus) return;
    var el = document.getElementById(p._focus);
    if (!el) return;
    try { el.focus({ preventScroll: true }); var n = String(el.value || '').length; if (el.setSelectionRange && el.type !== 'date') el.setSelectionRange(n, n); } catch (e) {}
  }

  /* ============================================================ shared fragments ========================= */
  function sheet(html) { var s = R.sheet(html); if (s) s.classList.add('rep'); return s; }
  function loadingHTML() { return '<main class="rep screen"><div class="center"><div class="spinner" aria-label="Loading"></div></div></main>'; }
  function syncNote() {
    var n = R.outbox.count();
    return '<span class="syncnote" id="syncNote">' + (navigator.onLine ? '' : '<span class="offline">Offline</span>') + (n ? '<span class="offline">' + n + ' to sync</span>' : '') + '</span>';
  }
  function syncNoteUpdate() { var el = document.getElementById('syncNote'); if (el) el.outerHTML = syncNote(); }
  function offlineCard(what) {
    var n = all().filter(function (e) { return e._pending; }).length;
    return '<div class="card"><h2>No signal</h2><p class="muted">' + esc(what) + ' Names you add now are kept on your phone and sync when you’re back online.</p>' +
      (n ? '<p class="small">' + R.plural(n, 'name') + ' waiting to sync.</p>' : '') +
      '<button class="btn primary" data-a="rep-retry">Try again</button><button class="btn" data-a="tab" data-k="scenes">Enter a Scene</button></div>';
  }
  function statusChip(e, forList) {
    if (e.removed) return '<span class="chip">Removed</span>';
    if (forList && e._pending) return '<span class="chip"><i class="dot white"></i>Syncing</span>';
    if (e.dnc) return '<span class="chip">Do not contact</span>';
    if (held(e)) return '<span class="chip held">Check</span>';
    if (lit(e)) return '<span class="chip win"><i class="dot"></i>Complete</span>';
    return '<span class="chip draft">Draft · ' + missingOf(e).length + ' left</span>';
  }
  function reqRows(list) {
    return '<div class="checks">' + [1, 2, 3, 4].map(function (n) {
      var r = reqOf(list, n) || {}, on = !!r.confirmed;
      return '<div><span class="ck' + (on ? ' on' : '') + '">' + (on ? R.ICON.check : '') + '</span><span>' + esc(R.REQ_LABEL[n]) +
        (on ? ' <span class="dim">· Confirmed' + (r.by_name ? ' by ' + esc(r.by_name) : '') + (r.event_date ? ', ' + esc(R.date(r.event_date)) : '') + '</span>' : ' <span class="dim">· Not yet</span>') + '</span></div>';
    }).join('') + '</div>';
  }
  function stageChip(i) {
    if (i.outcome === 'follow_up') return 'Later' + (i.outcome_date ? ': ' + R.date(i.outcome_date) : '');
    if (i.outcome) return R.OUTCOME_LABEL[i.outcome] || 'Closed';
    var s = i.stage === 'added' && i.status === 'planned' ? 'intro_planned' : i.stage;
    return R.STAGE_LABEL[s] || 'Added';
  }
  /* next = {who:'you'|'leader', name, text}: text is one of the server's phrases ("schedules the meeting",
     "make the introduction", "nothing needed from you", ...) or a leader's own next-action note */
  var LEADER_PHRASES = { 'schedules the meeting': 1, 'holds the meeting': 1, 'confirms the meeting': 1, 'confirms the commitment': 1, 'confirms the agreement': 1,
    'confirms start date and travel plans': 1, 'reviews the referral reward': 1, 'follows up': 1 };
  function nextLine(i) {
    var n = i && i.next;
    if (!n) return '';
    var t = trim(n.text);
    if (!t) return '';
    if (/^next:/i.test(t)) return sentence(t);
    if (/^nothing needed/i.test(t)) return sentence(t.charAt(0).toUpperCase() + t.slice(1));
    if (n.who === 'you') {
      var f = firstOf(i);
      if (t === 'follow up') t = 'check back with ' + f + (i.outcome_date ? ' on ' + R.date(i.outcome_date) : '');
      else if (t === 'introduce them') t = 'introduce ' + f;
      else if (t === 'make the introduction') t = 'tell ' + f + ' about RALLY';
      return sentence('Next: you, ' + t);
    }
    if (t === 'follow up') t = 'follows up';
    var who = trim(n.name) || leaderName(i) || 'your leader';
    return sentence('Next: ' + who + (LEADER_PHRASES[t.toLowerCase()] ? ' ' : ', ') + t);
  }
  function introStatus(i, f) {
    var L = leaderName(i) || 'your leader';
    if (i.outcome === 'do_not_contact') return dncLine(f);
    if (i.outcome === 'not_interested') return f + ' said not for them' + (i.outcome_date ? ' (' + R.date(i.outcome_date) + ')' : '') + '. Still counts on your Wall.';
    if (i.outcome === 'follow_up') return 'Follow up with ' + f + (i.outcome_date ? ' on ' + R.date(i.outcome_date) : '') + '.';
    var s = i.stage === 'added' && i.status === 'planned' ? 'intro_planned' : i.stage;
    if (s === 'intro_planned') return 'Introduction planned.';
    if (s === 'introduced') return 'Introduced' + (i.recorded_at ? ' on ' + R.date(i.recorded_at) : '') + '.' + (i.received ? ' ' + L + ' has it.' : ' Nothing needed from you right now.');
    if (s === 'meeting_scheduled') return 'Meeting with ' + L + (i.meeting_at ? ': ' + R.dateTime(i.meeting_at) : '') + '.';
    return (R.STAGE_LABEL[s] || 'Added') + '.';
  }

  /* the Wall: complete tiles first (in completion order), then possible duplicates, then drafts */
  function wallHTML(d) {
    var c = d.count || 0;
    var order = litList().map(function (e) { return ['done', e]; })
      .concat(heldList().map(function (e) { return ['held', e]; }), draftList().map(function (e) { return ['draft', e]; })).slice(0, 100);
    var nm = nextMs(c), cells = [];
    for (var i = 0; i < 100; i++) {
      var o = order[i], cls = 't';
      if (o) {
        cls += ' ' + o[0];
        if (o[1]._pending) cls += ' sync';
        if (o[0] === 'done' && fx.done[o[1].id]) cls += ' sweep';
        if (o[0] === 'draft' && fx.drafted[o[1].id]) cls += ' popin';
      } else {
        if (i === 9 || i === 24 || i === 49 || i === 74) cls += ' ms';
        if (nm && i === nm - 1) cls += ' ms-next';
      }
      cells.push('<div class="' + cls + '"></div>');
    }
    var wcls = 'wall' + (hasMs(25) ? ' frame' : '') + (hasMs(50) ? ' dotgrid' : '');
    return '<div class="' + wcls + '" data-a="wall" role="button" tabindex="0" aria-label="Your Wall: ' + Math.min(c, 100) + ' of 100 tiles lit. Open My Network.">' +
      (hasMs(10) ? '<img class="stamp10" src="' + R.PANTHER + '" alt="">' : '') + cells.join('') + '</div>';
  }
  function legendHTML() {
    return '<div class="wall-legend" aria-hidden="true"><span><i class="sw done"></i>Complete, counts</span><span><i class="sw draft"></i>Draft, doesn’t count yet</span><span><i class="sw held"></i>Check: possible duplicate</span></div>';
  }
  function subline(d, ds) {
    var c = d.count || 0, r = d.list_reward;
    if (r && r.status === 'ready' && r.hold && c < 100) return c + '/100. List reward: Ready for review, on hold until you’re back at 100. Nothing was lost.';
    if (c >= 100) return 'Wall complete.';
    if (c === 0 && !ds.length) return 'Your Wall is dark. Enter a Scene: a short memory prompt from one part of your life.';
    if (c === 99) return '99/100, 1 more to complete your list.';
    if (c >= 75) return (100 - c) + ' to go.' + (ds.length ? ' Finish your ' + R.plural(ds.length, 'draft') + ' and you’re at ' + Math.min(100, c + ds.length) + '.' : '');
    var one = ds.filter(function (e) { return missingOf(e).length === 1; }).length, nm = nextMs(c), parts = [];
    if (one) parts.push(one + (one === 1 ? ' draft is' : ' drafts are') + ' one field away');
    parts.push((nm - c) + ' more until your next milestone (' + nm + ')');
    return parts.join(' | ');
  }
  function nextAction(d) {
    var c = d.count || 0, ds = draftList(), lr = d.list_reward;
    if (lr && lr.status === 'needs_correction' && !lr.reversed && d.held > 0) return { label: 'Fix duplicates', a: 'net-filter-go', v: 'held' };
    if (c >= 100 && lr && lr.status === 'ready' && !lr.hold && !lr.reversed) return { label: 'Show your leader', a: 'congrats' };
    if (c >= 100) {
      var w = waiting()[0];
      if (w && w.status === 'planned') return { label: 'I introduced ' + firstOf(w), a: 'ri-open', id: w.entry_id };
      if (w) return { label: 'Open ' + firstOf(w) + '’s introduction', a: 'intro-open', id: w.entry_id };
      return { label: 'Introduce someone', a: 'intro-pick' };
    }
    var one = ds.filter(function (e) { return missingOf(e).length === 1; }).length, nm = nextMs(c);
    if (ds.length >= 3 || (one > 0 && nm && c + one >= nm)) return { label: 'Finish ' + R.plural(ds.length, 'draft') + ' (' + Math.max(1, Math.round(ds.length * 20 / 60)) + ' min)', a: 'sweep-all' };
    var ls = lastScene();
    if (ls && sceneStats(ls).names < 5) return { label: 'Continue: ' + R.scene(ls).name, a: 'scene-open', sid: ls };
    return { label: 'Enter a Scene', a: 'tab', k: 'scenes' };
  }
  function actionButton(na, cls) {
    return '<button class="btn ' + (cls || 'primary') + '" data-a="' + na.a + '"' + (na.sid ? ' data-sid="' + esc(na.sid) + '"' : '') + (na.k ? ' data-k="' + esc(na.k) + '"' : '') +
      (na.id ? ' data-id="' + esc(na.id) + '"' : '') + (na.v ? ' data-v="' + esc(na.v) + '"' : '') + '>' + esc(na.label) + '</button>';
  }
  /* the list reward in one line, exactly the blueprint's rep-facing wording */
  function listLine(d) {
    var c = d.count || 0, r = d.list_reward;
    if (!r) return Math.min(c, 100) + '/100 contacts complete. Complete your 100 list to qualify for the $100 completion reward.';
    if (r.reversed) return 'List reward: Reversed.' + (trim(r.rep_reason) ? ' Reason: ' + sentence(r.rep_reason) : '');
    if (r.status === 'paid') return 'List reward: ' + amount(r) + '. Pay issued ' + R.date(r.paid_on) + '.';
    if (r.status === 'approved') return 'List reward: ' + amount(r) + ' · Pending pay. Nothing needed from you. RALLY pays you directly and marks it Pay issued here.';
    if (r.status === 'needs_correction') return 'List reward: Needs correction. Your leader will go over what to fix with you. Nothing was lost.';
    if (r.status === 'ready' && r.hold) return Math.min(c, 100) + '/100. List reward: Ready for review, on hold until you’re back at 100. Nothing was lost.';
    if (r.status === 'ready') return '100/100 complete. Congratulations! Show this to your leader and walk through your list and signed friends together to confirm your prize!';
    return Math.min(c, 100) + '/100 contacts complete. Complete your 100 list to qualify for the $100 completion reward.';
  }
  function stripHTML(d) {
    var c = d.count || 0, r = d.list_reward, open = ' data-a="tab" data-k="rewards" role="button" tabindex="0"';
    if (r && r.reversed) return '<div class="strip"' + open + '><div>' + esc(listLine(d)) + '</div></div>';
    if (r && r.status === 'paid') return '<div class="strip win"' + open + '>' + stampImg() + '<div><b>List reward: ' + esc(amount(r)) + '.</b> Pay issued ' + esc(R.date(r.paid_on)) + '.</div></div>';
    if (r && r.status === 'approved') return '<div class="strip win"' + open + '>' + stampImg() + '<div><b>List reward: ' + esc(amount(r)) + ' · Pending pay.</b> Nothing needed from you. RALLY pays you directly and marks it Pay issued here.</div></div>';
    if (r && r.status === 'ready' && !r.hold) return '<div class="strip win"' + open + '><div><b>100/100 complete.</b> Congratulations! Show this to your leader and walk through your list and signed friends together to confirm your prize!</div></div>';
    if (r && (r.status === 'ready' || r.status === 'needs_correction')) return '<div class="strip"' + open + '><div>' + esc(listLine(d)) + '</div></div>';
    var syncing = all().filter(function (e) { return e._pending && lit(e); }).length;
    if (c < 100 && c + syncing >= 100) return '<div class="strip"><div>100/100 syncing.</div></div>';
    return '<div class="strip"' + open + '><div><div>List reward: In progress.</div><div class="muted">Complete your 100 list to qualify for the $100 completion reward.</div></div></div>';
  }
  function incentivesRow(d) {
    if (!d.incentives.length) return '';
    return '<section class="card flat"><div class="between"><span class="caps">Incentives</span><button class="link small" data-a="tab" data-k="rewards">See all</button></div><div class="inc-row">' +
      d.incentives.map(function (x) {
        var src = coverOf(x);
        return '<button class="inc-mini" data-a="tab" data-k="rewards">' + (src ? '<img src="' + esc(src) + '" alt="">' : '<span class="ph" aria-hidden="true"></span>') +
          '<span class="nm">' + esc(x.name) + '</span><span class="small muted">Prize: ' + esc(R.money(x.prize_cents)) + '</span></button>';
      }).join('') + '</div></section>';
  }
  function introPreview() {
    var board = introList().filter(onBoard);
    if (!board.length) return '';
    var w = waiting();
    var rows = (w.length ? w : board).slice(0, 3).map(function (i) {
      var other = creditedElsewhere(i);
      return '<button class="ncard" data-a="intro-open" data-id="' + esc(i.entry_id) + '"><span class="top-row"><span class="nm">' + esc(nameOf(i)) + '</span><span class="chip">' + esc(other ? 'Introduced' : stageChip(i)) + '</span></span>' +
        '<span class="small muted">' + esc(other ? 'The referral reward went to another rep who introduced them first.' : (nextLine(i) || introStatus(i, firstOf(i)))) + '</span></button>';
    }).join('');
    return '<section class="card flat"><div class="between"><span class="caps">Intro Board' + (w.length ? ' · ' + w.length + ' waiting on you' : '') + '</span><button class="link small" data-a="tab" data-k="intros">See all intros</button></div>' + rows + '</section>';
  }
  function badgesHTML(d) {
    return '<section class="card flat"><div class="caps">Badges · game only, never cash</div><div class="chips">' + BADGES.map(function (b) {
      var on = d.badges.indexOf(b[0]) >= 0;
      return '<span class="chip' + (on ? ' win' : '') + '" title="' + esc(b[2]) + '">' + esc(b[1]) + '<span class="sr">' + (on ? ', earned' : ', not yet') + '</span></span>';
    }).join('') + '</div></section>';
  }

  /* ============================================================ onboarding ============================== */
  function previewWall() {
    var cells = '';
    for (var i = 0; i < 30; i++) cells += '<i' + (i === 0 ? ' class="on"' : '') + '></i>';
    return '<div class="pv" aria-hidden="true">' + cells + '</div>';
  }
  R.screens.onboarding = {
    mode: 'rep', bare: true,
    render: function (p) {
      var step = Math.max(0, Math.min(3, p.step || 0));
      var dots = '<div class="dots" role="img" aria-label="Card ' + (step + 1) + ' of 4">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
      var hero = '<div class="hero"><img src="' + R.PANTHER + '" alt="RALLY MKTG panther"><span class="wm">RALLY 100</span></div>';
      var body = '';
      if (step === 0) body = '<h1>Build your 100 list.</h1>' + previewWall() + '<p class="lines"><span>100 real people you know. Nobody has to want a job. You build it in Scenes: short memory prompts from one part of your life. Each person lights one tile on your Wall.</span></p>';
      if (step === 1) body = '<h1>Your rewards</h1><div class="lines"><div>Finish all 100: $100. One time.</div><div>Each friend you introduce who gets all four checks: $100. Each friend counts once.</div><div>The four checks: Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed (where travel applies).</div><div>When you finish, you and your leader walk through your list and signed friends together. Your leader approves your prize, then RALLY records it as paid.</div></div><button class="link ob-rules" data-a="rules">Full reward rules</button>';
      if (step === 2) body = '<h1>What counts</h1><div class="lines"><div>A contact counts with all four: first name, last name, one social handle with the app named, phone number.</div><div>Save names first, add details later. Drafts are kept but don’t count.</div></div>';
      if (step === 3) body = '<h1>Who sees your contacts</h1><p class="lines"><span>Every contact you save, including drafts, is visible to your leader and the RALLY recruiting team the moment you save it, not at 100. The RALLY recruiting team may contact people you introduce. Other reps never see your list.</span></p>' +
        '<label class="check-row" id="ackRow"><input type="checkbox" id="ackBox"' + (p.ack ? ' checked' : '') + '><span>I understand my contacts are shared with the RALLY recruiting team.</span></label><p class="small muted" id="ackHint" aria-live="polite"></p>';
      var btns = step < 3
        ? '<div class="row">' + (step > 0 ? '<button class="btn" data-a="ob-back">Back</button>' : '') + '<button class="btn primary" data-a="ob-next">Next</button></div>'
        : '<div class="row"><button class="btn" data-a="ob-back">Back</button><button class="btn primary" data-a="ob-go" id="obGo" aria-disabled="' + (p.ack ? 'false' : 'true') + '">Light the Wall</button></div><p class="small dim ob-cta">Start building your 100</p>';
      return '<main class="rep ob">' + hero + dots + body + '<div class="grow"></div>' + btns + '<button class="btn ghost" data-a="sign-out">Sign out</button></main>';
    },
    after: function (p) {
      var b = document.getElementById('ackBox');
      if (b) b.addEventListener('change', function () { p.ack = b.checked; var g = document.getElementById('obGo'); if (g) g.setAttribute('aria-disabled', b.checked ? 'false' : 'true'); setText('ackHint', ''); });
    }
  };
  R.actions['ob-next'] = function () { R.view.p.step = Math.min(3, (R.view.p.step || 0) + 1); R.render(); try { window.scrollTo(0, 0); } catch (e) {} };
  R.actions['ob-back'] = function () { R.view.p.step = Math.max(0, (R.view.p.step || 0) - 1); R.render(); };
  R.actions['ob-go'] = function (btn) {
    var p = R.view.p;
    if (!p.ack) {
      var r = document.getElementById('ackRow');
      if (r) { r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); }
      setText('ackHint', 'Check the box to continue.');
      return;
    }
    R.call('accept_ack', { p_version: ACK_VERSION }, btn).then(function (res) {
      if (!res) return;
      return R.cloud.rpc('whoami', {}).then(function (me) { R.data.me = me; }, function () {}).then(function () {
        if (R.data.me) {
          R.data.me.ack_accepted = true;
          var s = R.cloud.session();
          if (s) R.store.set('r100_me_' + s.userId, R.data.me);
        }
        R.go('home');
      });
    });
  };
  R.actions.rules = function () {
    sheet('<h2>Reward rules</h2><div class="lines">' +
      '<div><b>List Completion Reward: $100, one time.</b> Your list reaches 100 distinct, complete contacts: first name, last name, one social handle with the app named, phone number. You and your leader walk through your list together, your leader does a quick spot-check and approves, then RALLY records it as paid.</div>' +
      '<div><b>Referral Reward: $100 per qualifying friend.</b> A friend you introduce gets all four checks, each confirmed by your leader: Meeting completed, Commitment confirmed, Agreement signed, Start date and travel plans confirmed (where travel applies). Each friend counts once. Your list doesn’t need to be finished.</div>' +
      '<div><b>Two reps, one friend.</b> The referral reward goes to whoever signs them first: the first introduction recorded in the app that your leader confirms received. Both reps still count the friend toward their 100.</div>' +
      '<div><b>What doesn’t count.</b> Drafts, possible duplicates, contacts marked Do not contact, and going past 100. XP, levels and badges are game progress, never cash.</div>' +
      '<div><b>No deadline.</b> Nothing expires and a missed day never erases progress.</div>' +
      '<div>‘Pay issued’ means RALLY marked your pay as sent on that date. This app doesn’t send money. RALLY pays you directly.</div>' +
      '</div><button class="btn" data-a="sheet-close">Close</button>');
  };

  /* ============================================================ home ==================================== */
  R.screens.home = {
    mode: 'rep', nav: 'rep',
    render: function () {
      var d = D();
      if (!d) return loadingHTML();
      if (d._skeleton) return '<main class="rep screen home">' + offlineCard('Your Wall loads when you’re back online.') + '</main>';
      var c = d.count || 0, ds = draftList(), lv = d.level || R.level(d.xp), xp = d.xp || 0, na = nextAction(d);
      var span = lv.next_min != null ? Math.max(1, lv.next_min - lv.min) : 1;
      var pct = lv.next_min != null ? Math.max(0, Math.min(100, Math.round((xp - lv.min) / span * 100))) : 100;
      var labels = Math.min(c, 100) + ' lit' + (d.drafts ? ' | ' + R.plural(d.drafts, 'draft') : '') + (d.held ? ' | ' + d.held + ' to check' : '');
      var syncing = all().filter(function (e) { return e._pending && lit(e); }).length;
      var over = c > 100 ? '<p class="small muted">Overflow +' + (c - 100) + '. Extra contacts help you make more introductions. The list reward is one-time.</p>' : '';
      var ret = '', ls = lastScene();
      if (ls && c < 100) { var st = sceneStats(ls); ret = '<p class="small muted">Last scene: ' + esc(R.scene(ls).name) + '. ' + st.lit + ' lit, ' + R.plural(st.drafts, 'draft') + ' left. Pick up where you left off.</p>'; }
      var lvl = '<div class="lv"><div class="lv-t"><b>' + esc(lv.name) + '</b> · ' + xp + ' XP' + (lv.next_name ? ' · ' + Math.max(0, lv.next_min - xp) + ' to ' + esc(lv.next_name) : '') + '</div><div class="xpbar" aria-hidden="true"><i style="width:' + pct + '%"></i></div></div>';
      return '<main class="rep screen home">' + wallHTML(d) +
        '<div class="count-block"><div class="big"><b>' + Math.min(c, 100) + '</b><span>/100 contacts complete</span>' + (syncing ? '<span class="syncing">(' + syncing + ' syncing)</span>' : '') + '</div>' +
        '<div class="labels">' + esc(labels) + '</div><div class="sub">' + esc(subline(d, ds)) + '</div>' + over + '</div>' +
        actionButton(na) + ret + lvl + legendHTML() + stripHTML(d) + incentivesRow(d) + introPreview() + badgesHTML(d) + '</main>';
    },
    after: function () { fx.done = {}; fx.drafted = {}; ensure(); }
  };
  R.actions.wall = function () { R.go('network'); };
  R.actions.congrats = function () { R.go('congrats', {}); };
  R.actions['rep-retry'] = function () { ensure(true); };
  R.actions['net-filter-go'] = function (b) { R.go('network', { f: b.dataset.v }); };

  /* ============================================================ scenes and drop-in ====================== */
  R.screens.scenes = {
    mode: 'rep', nav: 'rep',
    render: function () {
      var d = D() || skeleton(), known = !d._skeleton, c = d.count || 0, ds = draftList();
      var pinned = ds.length >= 5 ? '<button class="scene-card pin-card" data-a="sweep-all"><span class="nm">Light the Drafts</span><span class="muted">' + ds.length + ' drafts, most missing one field. Knock them out.</span></button>' : '';
      function card(sc, small) {
        var s = sceneStats(sc.id), locked = sc.unlock && c < sc.unlock;
        var stat = locked ? 'Unlocks at ' + sc.unlock + ' complete contacts' : (!known ? '' : (s.names ? s.lit + ' lit · ' + R.plural(s.drafts, 'draft') : 'not started'));
        return '<button class="scene-card' + (small ? ' sm' : '') + (locked ? ' locked' : '') + '" data-a="' + (locked ? 'locked' : 'scene-open') + '" data-sid="' + sc.id + '"' + (locked ? ' aria-disabled="true"' : '') + '>' +
          '<span class="nm">' + esc(sc.name) + (stat ? ' <span class="dim small">· ' + esc(stat) + '</span>' : '') + (s.cleared ? ' · <span class="cleared">Cleared</span>' : '') + '</span>' +
          (small ? '' : '<span class="muted">' + esc(sc.line) + '</span>') + '<span class="ft">' + sc.clears + ' names clears this scene. No limit.' + (sc.note ? ' ' + esc(sc.note) : '') + '</span></button>';
      }
      return '<main class="rep screen"><div><h1>Scenes</h1><p class="muted">Pick a scene. Skip any that aren’t you.</p>' + (known ? '<p class="small dim">' + Math.min(c, 100) + '/100 · ' + R.plural(d.drafts || 0, 'draft') + '</p>' : '') + '</div>' + pinned +
        R.SCENES.slice(0, 3).map(function (s) { return card(s, false); }).join('') + '<div class="caps">All scenes</div>' + R.SCENES.slice(3).map(function (s) { return card(s, true); }).join('') + '</main>';
    },
    after: function () { ensure(); }
  };
  R.actions['scene-open'] = function (b) { R.go('dropin', { sid: b.dataset.sid }); };
  R.actions.locked = function () { R.toast('Unlocks at 20 complete contacts'); };

  function drawPicks(sc, p) {
    if (p.draw) return p.draw;
    var lits = litList();
    if (sc.id === 'plusone') { p.draw = { names: lits.slice(-6).reverse(), tag: null }; return p.draw; }
    var byTag = {};
    lits.forEach(function (e) { (e.tags || []).forEach(function (t) { (byTag[t] = byTag[t] || []).push(e); }); });
    var tags = Object.keys(byTag).filter(function (t) { return byTag[t].length >= 3; });
    var tag = tags.length ? tags[Math.floor(Math.random() * tags.length)] : null;
    p.draw = { names: shuffle((tag ? byTag[tag] : lits).slice()).slice(0, 3), tag: tag };
    return p.draw;
  }
  R.screens.dropin = {
    mode: 'rep', bare: true,
    render: function (p) {
      var sc = R.scene(p.sid);
      if (!sc) return '<main class="rep screen nonav"><button class="link" data-a="tab" data-k="scenes">Scenes</button><p class="muted">That scene isn’t available.</p></main>';
      var first = !R.store.get(key('sprinted'), false);
      var timed = '<button class="btn {c}" data-a="sprint-start" data-sid="' + sc.id + '">Start a 60-second Sprint</button>', free = '<button class="btn {c}" data-a="sprint-free" data-sid="' + sc.id + '">Just add names</button>';
      var b = sc.leave ? free.replace('{c}', 'primary') + timed.replace('{c}', '') : timed.replace('{c}', 'primary') + free.replace('{c}', '');
      var extra = '';
      if (sc.id === 'plusone' || sc.id === 'mutual') {
        var dr = drawPicks(sc, p);
        if (dr.names.length) extra = '<div class="chips">' + dr.names.map(function (e) { return '<span class="chip">' + esc(nameOf(e)) + '</span>'; }).join('') + '</div>' +
          (sc.id === 'mutual' ? '<p class="small muted">' + (dr.tag ? 'All tagged ' + esc(dr.tag) + '. ' : '') + '<button class="link small" data-a="redraw">Draw again</button></p>' : '');
      }
      return '<main class="rep screen nonav"><div class="between"><button class="link" data-a="tab" data-k="scenes">Scenes</button>' + syncNote() + '</div><h1>' + esc(sc.name) + '</h1><p class="sp-line">' + esc(sc.line) + '</p>' + extra +
        (sc.cues.length ? '<div class="lines muted">' + sc.cues.map(function (q) { return '<div>' + esc(q) + '</div>'; }).join('') + '</div>' : '') +
        (first ? '<p class="muted">Say first names as fast as they come. Nothing is graded, nothing is final. You can stop any time.</p>' : '') + b + '</main>';
    },
    after: function () { ensure(); }
  };
  R.actions.redraw = function () { R.view.p.draw = null; R.render(); };
  R.actions['sprint-start'] = function (b) { R.go('sprint', { sid: b.dataset.sid, mode: 'timed' }); };
  R.actions['sprint-free'] = function (b) { R.go('sprint', { sid: b.dataset.sid, mode: 'free' }); };

  /* ============================================================ the Sprint ============================== */
  var sp = null;
  function stopSprint() {
    if (!sp) return;
    if (sp.timer) { clearInterval(sp.timer); sp.timer = null; }
    if (sp.idle) { clearTimeout(sp.idle); sp.idle = null; }
  }
  function focusInput() { var i = document.getElementById('spInput'); if (i) try { i.focus({ preventScroll: true }); } catch (e) {} }
  R.screens.sprint = {
    mode: 'rep', bare: true,
    render: function (p) {
      var sc = R.scene(p.sid);
      if (!sc) return '<main class="rep screen nonav"><button class="link" data-a="tab" data-k="scenes">Scenes</button></main>';
      return '<main class="rep screen nonav sprint"><div class="between"><span class="sp-count" id="spCount"></span><span class="row-end">' + syncNote() + '<button class="link" data-a="sp-done">Done</button></span></div>' +
        '<p class="sp-line" id="spLine">' + esc(sc.line) + '</p><div class="miniwall" id="miniWall" aria-hidden="true"></div><div class="lastnames" id="lastNames"></div>' +
        '<div id="pinned"></div><div id="cueBox" aria-live="polite"></div><div class="chips scroll" id="chainChips" role="group" aria-label="Chain prompts"></div>' +
        '<form class="sp-form" data-form="sp-add" id="spForm" autocomplete="off"><label class="sr" for="spInput">First name</label><input id="spInput" placeholder="First name (nickname ok)" autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" maxlength="121"><button class="btn primary" type="submit">Add</button></form>' +
        '<div class="savedcheck" id="spSaved" aria-live="polite"></div><p class="small muted" id="spHint">Just names. Details later.</p>' +
        '<button class="btn ghost" data-a="sp-dead" id="deadBtn">Dead end? Get a cue</button><div id="spSheet"></div></main>';
    },
    after: function (p) {
      if (!R.scene(p.sid)) return;
      if (!D()) { R.data.rep = skeleton(); overlay(R.data.rep); ensure(); }
      if (!sp || sp.p !== p) {
        stopSprint();
        sp = { p: p, sid: p.sid, mode: p.mode === 'free' ? 'free' : 'timed', left: p.mode === 'free' ? null : 60, names: [], timer: null, pinned: null, chips: null,
          rung: 0, cue: '', paused: false, idle: null, ended: false, sheetOpen: false, text: '', saved: '', hint: '' };
        R.store.set(key('last_scene'), p.sid);
        if (sp.mode === 'timed') sp.timer = setInterval(tick, 1000);
      }
      R.onLeave = stopSprint;
      var input = document.getElementById('spInput');
      input.value = sp.text || '';
      input.addEventListener('input', function () { sp.text = input.value; });
      if (sp.saved) setText('spSaved', sp.saved);
      if (sp.hint) setText('spHint', sp.hint);
      spUpdate(); spChipsRender(); renderPinned(); renderCue(); renderEnd(); armIdle();
      focusInput();
    }
  };
  function tick() {
    if (!sp || sp.paused || R.view.name !== 'sprint' || sp.left == null) return;
    if (sp.left > 0) { sp.left--; spCountUpdate(); }
    if (sp.left === 0 && !sp.ended) { sp.ended = true; sp.sheetOpen = true; clearInterval(sp.timer); sp.timer = null; renderEnd(); }
  }
  function spCountUpdate() {
    var el = document.getElementById('spCount');
    if (!el || !sp) return;
    var sc = R.scene(sp.sid), t = sp.left == null ? '' : ' · ' + Math.floor(sp.left / 60) + ':' + String(sp.left % 60).padStart(2, '0');
    el.textContent = sc.name + ' · ' + R.plural(sp.names.length, 'name') + t;
  }
  /* the mini-Wall keeps its tiles between draws so a pop-in animation is never restarted */
  function spUpdate() {
    if (!sp || R.view.name !== 'sprint') return;
    spCountUpdate(); syncNoteUpdate();
    var mw = document.getElementById('miniWall');
    if (mw) {
      var list = live().filter(function (e) { return e.scene === sp.sid && !e.dnc; }).sort(byCreated).slice(-30), want = {};
      list.forEach(function (e) { want[e.id] = 1; });
      Array.prototype.slice.call(mw.children).forEach(function (n) { if (!want[n.dataset.id]) n.remove(); });
      var have = {};
      Array.prototype.forEach.call(mw.children, function (n) { have[n.dataset.id] = n; });
      list.forEach(function (e) {
        var cls = 't ' + (lit(e) ? 'done' : (held(e) ? 'held' : 'draft')) + (e._pending ? ' sync' : ''), n = have[e.id];
        if (n) n.className = cls + (n.classList.contains('popin') ? ' popin' : '');
        else { n = document.createElement('div'); n.dataset.id = e.id; n.className = cls + (fx.drafted[e.id] ? ' popin' : ''); mw.appendChild(n); }
      });
      fx.drafted = {};
    }
    var ln = document.getElementById('lastNames');
    if (ln) ln.innerHTML = sp.names.slice(-3).map(function (n) { return '<span class="chip">' + esc(n) + '</span>'; }).join('');
  }
  function nameChips(n, sid) {
    var m = { shift: ['Who was on shift with ' + n + '?', 'Who covered for ' + n + '?'], lunch: ['Who sat next to ' + n + '?', 'Who did ' + n + ' always come with?'],
      bus: ['Who sat next to ' + n + '?', 'Who rode home with ' + n + '?'], gym: ['Who trains with ' + n + '?', 'Who did ' + n + ' bring along?'], family: ['Who did ' + n + ' bring?', 'Who sat next to ' + n + '?'] };
    return (m[sid] || ['Who was always with ' + n + '?', 'Who did ' + n + ' always bring?']).concat([n + '’s sibling or cousin?']);
  }
  function spChipsRender() {
    var box = document.getElementById('chainChips');
    if (!box || !sp) return;
    var list = sp.chips || R.scene(sp.sid).chains;
    box.innerHTML = list.map(function (q) { return '<button type="button" class="cbtn" data-a="sp-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    box.scrollLeft = 0;
  }
  function renderPinned() {
    var b = document.getElementById('pinned');
    if (b && sp) b.innerHTML = sp.pinned ? '<div class="pinned"><span>' + esc(sp.pinned) + '</span><button type="button" class="link" data-a="sp-unpin" aria-label="Unpin prompt">Clear</button></div>' : '';
  }
  function renderCue() { var b = document.getElementById('cueBox'); if (b && sp) b.innerHTML = sp.cue || ''; }
  function renderEnd() {
    var sh = document.getElementById('spSheet');
    if (!sh || !sp) return;
    if (!sp.sheetOpen) { sh.innerHTML = ''; return; }
    var n = sp.names.length;
    sh.innerHTML = '<div class="endsheet" role="status">' + (n
      ? '<h2>You called ' + R.plural(n, 'name') + '.</h2><p class="muted">Add their details to light their tiles.</p><div class="row"><button class="btn primary sm" data-a="sp-light">Light them up</button><button class="btn sm" data-a="sp-more">' + (sp.mode === 'timed' ? '30 more seconds' : 'Keep adding') + '</button></div>'
      : '<h2>No names yet. That’s fine.</h2><p class="muted">Try a cue, add 30 seconds or pick another scene.</p><div class="row"><button class="btn sm" data-a="sp-more">30 more seconds</button><button class="btn sm" data-a="tab" data-k="scenes">Other scenes</button></div>') + '</div>';
  }
  function armIdle() {
    if (!sp) return;
    if (sp.idle) clearTimeout(sp.idle);
    sp.idle = setTimeout(function () { var d = document.getElementById('deadBtn'); if (d) { d.classList.remove('pulse'); void d.offsetWidth; d.classList.add('pulse'); } }, 20000);
  }
  R.forms['sp-add'] = function () {
    var input = document.getElementById('spInput');
    if (!input) return;
    addSprintName(input.value);
    input.value = '';
    if (sp) sp.text = '';
    focusInput();
  };
  function addSprintName(raw) {
    var v = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!v || !sp) return;
    var parts = v.split(' '), first = parts.shift(), last = parts.join(' ');
    if (first.length > 60 || last.length > 60) { sp.hint = R.say('name_too_long'); setText('spHint', sp.hint); return; }
    var sc = R.scene(sp.sid), lower = first.toLowerCase();
    var same = live().filter(function (e) { return trim(e.first_name).toLowerCase() === lower; }).length;
    var p = { id: R.uuid(), first_name: first, last_name: last, tags: sc.tag ? [sc.tag] : [], scene: sp.sid, chain_hit: !!sp.pinned };
    if (!D()) R.data.rep = skeleton();
    localApply(p);
    fx.drafted[p.id] = true;
    R.outbox.add(p);
    sp.names.push(v);
    R.store.set(key('sprinted'), true);
    if (sp.names.length >= 10) awardBadge('sprinter');
    sp.chips = nameChips(first, sp.sid);
    sp.pinned = null;
    spUpdate(); spChipsRender(); renderPinned();
    sp.saved = '✓ ' + v + ' saved as a draft';
    setText('spSaved', sp.saved);
    var inp = document.getElementById('spInput');
    if (inp) { inp.classList.add('flash'); setTimeout(function () { inp.classList.remove('flash'); }, 150); }
    sp.hint = same ? 'You already have ' + same + ' ' + first + ' on your Wall. Just names. Details later.' : 'Just names. Details later.';
    setText('spHint', sp.hint);
    if (sp.sheetOpen) { sp.sheetOpen = false; renderEnd(); }
    armIdle();
  }
  function deadEnd() {
    if (!sp) return;
    var sc = R.scene(sp.sid), d = D(), c = (d && d.count) || 0, html;
    sp.rung++;
    if (sp.rung === 1) html = '<div class="cue">Try this: ' + esc(sc.chains[0]) + '</div>';
    else if (sp.rung === 2) html = '<div class="cue">Different angle: same place, a different year?</div>';
    else if (sp.rung === 3) {
      var thin = R.SCENES.filter(function (s) { return s.id !== sp.sid && !(s.unlock && c < s.unlock); }).sort(function (a, b) { return sceneStats(a.id).names - sceneStats(b.id).names; })[0];
      html = '<div class="cue"><span>Switch scenes? ' + esc(thin.name) + ' has ' + R.plural(sceneStats(thin.id).names, 'name') + '.</span><div class="row"><button type="button" class="btn sm" data-a="sp-switch" data-sid="' + thin.id + '">Switch</button><button type="button" class="btn sm ghost" data-a="sp-stay">Stay here</button></div></div>';
    } else if (sp.rung === 4) html = '<div class="cue">Open your Phone app’s Recents. Say who’s there. Your sprint waits here.</div>';
    else {
      var lits = litList();
      if (c >= 20 && lits.length) html = '<div class="cue">Pick someone on your Wall. Who did ' + esc(firstOf(lits[(sp.rung * 7) % lits.length])) + ' always bring?</div>';
      else html = '<div class="cue">' + esc(sc.chains[sp.rung % sc.chains.length]) + '</div>';
    }
    sp.cue = html;
    renderCue(); armIdle(); focusInput();
  }
  R.actions['sp-done'] = function () {
    if (!sp || !sp.names.length) { R.go('scenes'); return; }
    if (sp.timer) { clearInterval(sp.timer); sp.timer = null; }
    sp.ended = true; sp.sheetOpen = true; renderEnd();
  };
  R.actions['sp-light'] = function () { var sid = sp ? sp.sid : null; R.go('sweep', { queue: sweepIds(sid), i: 0, sid: sid }); };
  R.actions['sp-more'] = function () {
    if (!sp) return;
    sp.ended = false; sp.sheetOpen = false; renderEnd();
    if (sp.mode === 'timed') { sp.left = (sp.left || 0) + 30; if (!sp.timer) sp.timer = setInterval(tick, 1000); }
    spCountUpdate(); focusInput();
  };
  R.actions['sp-chip'] = function (b) { if (!sp) return; sp.pinned = b.dataset.q; renderPinned(); focusInput(); };
  R.actions['sp-unpin'] = function () { if (!sp) return; sp.pinned = null; renderPinned(); focusInput(); };
  R.actions['sp-dead'] = function () { deadEnd(); };
  R.actions['sp-switch'] = function (b) { R.go('sprint', { sid: b.dataset.sid, mode: sp ? sp.mode : 'timed' }); };
  R.actions['sp-stay'] = function () { if (sp) { sp.cue = ''; renderCue(); } focusInput(); };

  /* ============================================================ contact form (Add Contact and the Sweep) == */
  function sweepIds(sid) {
    return draftList().filter(function (e) { return !sid || e.scene === sid; })
      .sort(function (a, b) { return missingOf(a).length - missingOf(b).length || byCreated(a, b); }).map(function (e) { return e.id; });
  }
  function draftVals(p, e) {
    var v = { first_name: e ? e.first_name || '' : '', last_name: e ? e.last_name || '' : '', phone: e && e.phone ? R.fmtPhone(e.phone) : '', handle: e ? R.normHandle(e.handle) : '',
      platform: e ? e.platform || '' : '', other_app: e ? e.other_app || '' : '', notes: e ? e.notes || '' : '', tags: e ? (e.tags || []).slice() : [] };
    var dr = p && p.draft;
    if (dr && dr.id === (e ? e.id : 'new') && dr.v) Object.keys(dr.v).forEach(function (k) { if (dr.v[k] !== null && dr.v[k] !== undefined) v[k] = dr.v[k]; });
    return v;
  }
  function fld(id, label, type, value, ph, missing, extra) {
    return '<div class="field' + (missing ? ' missing' : '') + '"><label for="' + id + '">' + esc(label) + (missing ? ' <span class="dim">· Missing</span>' : '') + '</label>' +
      '<input id="' + id + '" type="' + (type === 'tel' ? 'tel' : 'text') + '"' + (type === 'tel' ? ' inputmode="tel"' : ' autocapitalize="words"') + ' autocomplete="off" maxlength="' + (type === 'tel' ? 24 : (id === 'fOther' ? 40 : 60)) + '" value="' + esc(value) + '" placeholder="' + esc(ph) + '">' +
      (extra || '') + '<div class="err" id="e' + id.slice(1) + '" aria-live="polite"></div></div>';
  }
  /* why an entry is held: 'phone' (only then can it be "Different people"), 'both', 'handle', or 'person'
     (the server linked both entries to the same Person) */
  function heldBy(e) {
    var o = byId(e.held_of);
    if (!o) return e._heldBy || (R.phoneOk(e.phone) ? 'phone' : 'handle');
    var ph = R.phoneOk(e.phone) && e.phone === o.phone, hk = handleKey(e), hd = !!hk && hk === handleKey(o);
    return ph && hd ? 'both' : (ph ? 'phone' : (hd ? 'handle' : 'person'));
  }
  var SAME = { phone: ' (same phone)', handle: ' (same handle)', both: ' (same phone and handle)', person: '' };
  function bannerKey(e) { return e && held(e) ? [e.id, e.held_of, e.held_of_name || '', heldBy(e)].join('|') : ''; }
  function dupBanner(e) {
    if (!e || !held(e)) return '';
    var o = byId(e.held_of), on = e.held_of_name || (o ? nameOf(o) : 'This contact'), by = heldBy(e);
    return '<div class="banner" role="alert"><div>Looks like <b>' + esc(on) + '</b> is already on your Wall' + SAME[by] + '. Same person?</div>' +
      '<div class="row"><button type="button" class="btn sm primary" data-a="dup-same" data-id="' + esc(e.id) + '">Same person</button>' +
      (by === 'phone' ? '<button type="button" class="btn sm" data-a="dup-diff" data-id="' + esc(e.id) + '">Different people</button>'
        : '<button type="button" class="btn sm" data-a="dup-fix" data-id="' + esc(e.id) + '">' + (by === 'person' ? 'Fix the details' : 'Fix the handle') + '</button>') + '</div>' +
      '<p class="small muted">Your first ' + esc(trim(on).split(' ')[0]) + ' still counts. This one won’t until you pick.</p></div>';
  }
  function formHTML(e, mode, p) {
    var isNew = !e, v = draftVals(p, e), m = e ? missingOf(e) : ['Last name', 'Phone', 'Social handle'];
    var show = function (k) { return mode !== 'sweep' || m.indexOf(k) >= 0; };
    var plat = v.platform || '';
    var h = '<form data-form="cform" id="cForm" data-mode="' + mode + '" data-id="' + esc(e ? e.id : '') + '" data-platform="' + esc(plat) + '" class="card" autocomplete="off" novalidate>';
    h += '<div class="between"><h2 class="cname">' + (isNew ? 'New contact' : esc(nameOf(e))) + '</h2><span id="cChip">' + (e ? statusChip(e) : '<span class="chip draft">New</span>') + '</span></div>';
    h += '<p class="share">This contact is shared with the RALLY recruiting team.</p>';
    h += '<div id="dupBox" data-k="' + esc(bannerKey(e)) + '">' + dupBanner(e) + '</div>';
    if (e && e.dnc) h += '<p class="small muted">' + esc(dncLine(firstOf(e))) + '</p>';
    if (mode !== 'sweep') h += fld('fFirst', 'First name', 'text', v.first_name, 'First name (nickname ok)', false);
    if (show('Last name')) h += fld('fLast', 'Last name', 'text', v.last_name, '', m.indexOf('Last name') >= 0);
    if (show('Phone')) h += fld('fPhone', 'Phone', 'tel', v.phone, '(555) 014-2233', m.indexOf('Phone') >= 0, m.indexOf('Phone') >= 0 ? '<span class="hint">Don’t have it? Check Recents, your group chat, or their Snap or IG bio.</span>' : '');
    if (show('Social handle')) {
      h += '<div class="field' + (m.indexOf('Social handle') >= 0 ? ' missing' : '') + '"><label for="fHandle">Social handle' + (m.indexOf('Social handle') >= 0 ? ' <span class="dim">· Missing</span>' : '') + '</label>' +
        '<div class="hand"><span>@</span><input id="fHandle" value="' + esc(v.handle) + '" placeholder="marcus.lee" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" maxlength="200"></div>' +
        '<div class="caps which" id="whichL">Which app?</div><div class="chips" role="group" aria-labelledby="whichL">' + R.PLATFORMS.map(function (x) {
          return '<button type="button" class="cbtn' + (plat === x ? ' on' : '') + '" data-a="plat" data-v="' + esc(x) + '" aria-pressed="' + (plat === x) + '">' + esc(x) + '</button>';
        }).join('') + '</div>' +
        '<div id="otherWrap"' + (plat === 'Other' ? '' : ' hidden') + '>' + fld('fOther', 'App name', 'text', v.other_app, '', false) + '</div><div class="err" id="eHandle" aria-live="polite"></div></div>';
    }
    if (mode === 'sweep' && e) {
      var filled = [];
      if (m.indexOf('Last name') < 0 && e.last_name) filled.push(e.last_name);
      if (m.indexOf('Phone') < 0) filled.push(R.fmtPhone(e.phone));
      if (m.indexOf('Social handle') < 0) filled.push('@' + R.normHandle(e.handle) + ' on ' + (e.platform === 'Other' ? e.other_app : e.platform));
      if (filled.length) h += '<p class="collapsed">' + esc(filled.join(' · ')) + '</p>';
    }
    if (mode !== 'sweep') {
      h += '<details id="cMore"' + (p && p.moreOpen ? ' open' : '') + '><summary class="caps sum">More (optional)</summary><div class="field" style="margin-top:8px"><span class="lbl" id="tagsL">Tags</span><div class="chips" role="group" aria-labelledby="tagsL">' +
        R.TAGS.map(function (t) { var on = v.tags.indexOf(t) >= 0; return '<button type="button" class="cbtn' + (on ? ' on' : '') + '" data-a="tag" data-v="' + esc(t) + '" aria-pressed="' + on + '">' + esc(t) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field" style="margin-top:10px"><label for="fNotes">Notes</label><textarea id="fNotes" maxlength="2000" placeholder="How you know them">' + esc(v.notes) + '</textarea><span class="hint">Never type card or bank details here.</span></div></details>';
    }
    h += '<p class="small muted" id="leftLine" aria-live="polite"></p>';
    if (mode === 'sweep') h += '<div class="row"><button type="button" class="btn" data-a="sw-skip">Skip for now</button><button type="submit" class="btn primary">Save and next</button></div>';
    else if (isNew) h += '<button type="submit" class="btn primary" data-another="1">Save and add another</button><button type="button" class="btn" data-a="c-save">Save and finish</button>';
    else if (e.removed) h += '<p class="small muted">Removed contacts stay in RALLY’s records. Adding one back never earns XP or a reward twice.</p><button type="button" class="btn primary" data-a="c-restore" data-id="' + esc(e.id) + '">Restore</button>';
    else h += '<button type="submit" class="btn primary">Save</button><button type="button" class="btn danger" data-a="c-remove" data-id="' + esc(e.id) + '">Remove contact</button>';
    return h + '<p class="share">This contact is shared with the RALLY recruiting team.</p></form>';
  }
  function formVals() {
    var f = document.getElementById('cForm');
    if (!f) return null;
    function v(id) { var el = document.getElementById(id); return el ? el.value : null; }
    var tags = f.querySelector('[data-a="tag"]') ? Array.prototype.map.call(f.querySelectorAll('[data-a="tag"].on'), function (b) { return b.dataset.v; }) : null;
    return { first_name: v('fFirst'), last_name: v('fLast'), phone: v('fPhone'), handle: v('fHandle'), platform: f.dataset.platform || '', other_app: v('fOther'), notes: v('fNotes'), tags: tags };
  }
  function saveDraft(p) {
    var f = document.getElementById('cForm');
    if (!f || !p) return;
    p.draft = { id: f.dataset.id || 'new', v: formVals() };
  }
  function previewEntry() {
    var f = document.getElementById('cForm'), vals = formVals(), e = f && f.dataset.id ? byId(f.dataset.id) : null;
    var t = e ? Object.assign({}, e) : { first_name: '', last_name: '', phone: '', handle: '', platform: '', other_app: '' };
    if (vals.first_name !== null) t.first_name = trim(vals.first_name);
    if (vals.last_name !== null) t.last_name = trim(vals.last_name);
    if (vals.phone !== null) t.phone = R.normPhone(vals.phone);
    if (vals.handle !== null) { t.handle = cleanHandle(vals.handle); t.platform = vals.platform; }
    if (vals.other_app !== null) t.other_app = trim(vals.other_app);
    return t;
  }
  function updateLeft() {
    var el = document.getElementById('leftLine'), f = document.getElementById('cForm');
    if (!el || !f) return;
    var e = f.dataset.id ? byId(f.dataset.id) : null;
    if (e && e.dnc) { el.textContent = ''; return; }
    if (e && held(e)) { el.textContent = 'Possible duplicate. Pick an answer above.'; return; }
    var t = previewEntry(), m = R.missing(t);
    if (!trim(t.first_name)) { el.textContent = 'Start with a first name.'; return; }
    el.textContent = m.length ? m.length + ' left: ' + m.join(', ') + '.' : 'Complete. Counts toward your 100.';
  }
  function validate(vals) {
    var ok = true;
    function err(id, msg) { var el = document.getElementById(id); if (el) el.textContent = msg || ''; if (msg) ok = false; }
    if (vals.first_name !== null) err('eFirst', !trim(vals.first_name) ? R.say('first_required') : (trim(vals.first_name).length > 60 ? R.say('name_too_long') : ''));
    if (vals.last_name !== null) err('eLast', trim(vals.last_name).length > 60 ? R.say('name_too_long') : '');
    if (vals.phone !== null) err('ePhone', trim(vals.phone) && !R.phoneOk(R.normPhone(vals.phone)) ? R.say('invalid_phone') : '');
    if (vals.handle !== null) {
      var hv = cleanHandle(vals.handle);
      err('eHandle', hv.length > 100 ? 'That handle is too long.' : (hv && !vals.platform ? R.say('platform_required') : (vals.platform === 'Other' && hv && !trim(vals.other_app) ? R.say('other_app_required') : '')));
    }
    if (!ok) { var first = document.querySelector('#cForm .err:not(:empty)'); if (first && first.parentNode) { var inp = first.parentNode.querySelector('input'); if (inp) try { inp.focus(); } catch (e) {} } }
    return ok;
  }
  function buildPayload(vals, e) {
    var p = { id: e ? e.id : R.uuid() };
    if (vals.first_name !== null) p.first_name = trim(vals.first_name).replace(/\s+/g, ' ');
    if (vals.last_name !== null) p.last_name = trim(vals.last_name).replace(/\s+/g, ' ');
    if (vals.phone !== null) p.phone = trim(vals.phone) ? R.normPhone(vals.phone) : '';
    if (vals.handle !== null) {
      p.handle = cleanHandle(vals.handle);
      p.platform = vals.platform || '';
      p.other_app = p.platform === 'Other' ? trim(vals.other_app) : '';
    }
    if (vals.notes !== null) p.notes = vals.notes;
    if (vals.tags !== null) p.tags = vals.tags;
    if (!e) { if (p.tags === undefined) p.tags = []; p.scene = null; p.chain_hit = false; }
    return p;
  }
  function bindForm(p) {
    var f = document.getElementById('cForm');
    if (!f) return;
    f.addEventListener('input', function (ev) {
      if (ev.target && ev.target.id === 'fHandle') sniffPlatform();
      if (ev.target && ev.target.id === 'fHandle') { var hv = cleanHandle(ev.target.value); setText('eHandle', hv && !f.dataset.platform ? R.say('platform_required') : ''); }
      saveDraft(p); updateLeft();
    });
    var more = document.getElementById('cMore');
    if (more) more.addEventListener('toggle', function () { p.moreOpen = more.open; });
    updateLeft();
    restoreFocus(p);
  }
  function setPlatform(v) {
    var f = document.getElementById('cForm');
    if (!f) return;
    f.dataset.platform = v;
    Array.prototype.forEach.call(f.querySelectorAll('[data-a="plat"]'), function (x) { var on = x.dataset.v === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    var ow = document.getElementById('otherWrap');
    if (ow) ow.hidden = v !== 'Other';
    setText('eHandle', '');
    saveDraft(R.view.p); updateLeft();
  }
  function sniffPlatform() {
    var h = document.getElementById('fHandle');
    if (!h) return;
    var m = /^\s*(?:https?:\/\/)?(?:www\.)?([^\/\s]+\.[a-z]{2,})\//i.exec(h.value);
    if (!m) return;
    var host = m[1].toLowerCase();
    for (var i = 0; i < HOSTS.length; i++) if (HOSTS[i][0].test(host)) { setPlatform(HOSTS[i][1]); return; }
  }
  function formRefresh() {
    var f = document.getElementById('cForm');
    if (!f) { R.render(); return; }
    syncNoteUpdate();
    var id = f.dataset.id, e = id ? byId(id) : null, p = R.view.p;
    if (id && !e) { R.render(); return; }
    if (!e) return;
    if (R.view.name === 'sweep' && (lit(e) || gone(e)) && !f.contains(document.activeElement)) { p.draft = null; p.i++; R.render(); return; }
    var chip = document.getElementById('cChip');
    if (chip) chip.innerHTML = statusChip(e);
    var box = document.getElementById('dupBox'), k = bannerKey(e);
    if (box && box.getAttribute('data-k') !== k) { box.innerHTML = dupBanner(e); box.setAttribute('data-k', k); }
    updateLeft();
  }
  function scrollToBanner() { var b = document.querySelector('#dupBox .banner'); if (b) try { b.scrollIntoView({ block: 'center' }); } catch (e) {} }
  R.actions.plat = function (b) { setPlatform(b.dataset.v); };
  R.actions.tag = function (b) { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); saveDraft(R.view.p); };

  R.screens.contact = {
    mode: 'rep', bare: true,
    render: function (p) {
      var e = p.id ? byId(p.id) : null;
      var back = '<button class="link" data-a="c-back">' + esc({ network: 'My Network', home: 'Home', intros: 'Introductions', intro: 'Back', sweep: 'Back' }[p.from] || 'My Network') + '</button>';
      if (p.id && !e) {
        if (!D() || D()._skeleton) return '<main class="rep screen nonav"><div class="between">' + back + '</div>' + offlineCard('This contact loads when you’re back online.') + '</main>';
        return '<main class="rep screen nonav"><div class="between">' + back + '</div><div class="card"><h2>That contact isn’t available.</h2><p class="muted">It may have been merged with another contact.</p></div></main>';
      }
      return '<main class="rep screen nonav"><div class="between">' + back + syncNote() + '</div>' + formHTML(e, 'contact', p) + (e ? introSection(e) : '') + '</main>';
    },
    after: function (p) {
      bindForm(p);
      if (!p.id && !p._focus) { var f = document.getElementById('fFirst'); if (f) try { f.focus(); } catch (x) {} }
      if (!D()) ensure();
    }
  };
  function introSection(e) {
    if (gone(e) || e.dnc || held(e)) return '';
    var i = introFor(e.id), f = firstOf(e);
    if (onBoard(i)) return '<section class="card flat"><div class="caps">Introduction</div><p>' + (creditedElsewhere(i) ? esc(otherLine(i)) : esc(introStatus(i, f)) + (nextLine(i) ? ' ' + esc(nextLine(i)) : '')) + '</p><button class="btn sm" data-a="intro-open" data-id="' + esc(e.id) + '">Open on your Intro Board</button></section>';
    if (!lit(e)) return '<section class="card flat"><div class="caps">Introduction</div><p class="muted">Finish this contact to introduce them.</p></section>';
    return '<section class="card flat"><div class="caps">Introduction</div><p class="muted">You make the intro yourself: text, call or in person. RALLY only keeps track.</p><button class="btn sm" data-a="intro-open" data-id="' + esc(e.id) + '">Introduce ' + esc(f) + '</button></section>';
  }
  function goBack(p) {
    if (p.from === 'intro' && p.id) R.go('intro', { id: p.id });
    else R.go(p.from && R.screens[p.from] && p.from !== 'sweep' && p.from !== 'contact' ? p.from : 'network');
  }
  R.actions['c-back'] = function () { goBack(R.view.p); };
  R.forms.cform = function (f, ev) {
    if (f.dataset.mode === 'sweep') { sweepSave(); return; }
    var sub = ev && ev.submitter;
    contactSave(!!(sub && sub.dataset && sub.dataset.another));
  };
  R.actions['c-save'] = function () { contactSave(false); };
  function contactSave(another) {
    var p = R.view.p, f = document.getElementById('cForm');
    if (!f) return;
    var vals = formVals();
    if (!validate(vals)) return;
    var e = f.dataset.id ? byId(f.dataset.id) : null;
    if (e && gone(e)) { R.toast(R.say('entry_removed'), 'bad'); return; }
    var pl = buildPayload(vals, e), wasLit = e ? lit(e) : false;
    if (!D()) R.data.rep = skeleton();
    var ne = localApply(pl);
    p.draft = null;
    R.outbox.add(pl);
    if (lit(ne) && !wasLit) { fx.done[ne.id] = true; R.haptic(); }
    if (held(ne)) {
      if (e) { R.render(); scrollToBanner(); } else { R.go('contact', { id: ne.id, from: p.from }); scrollToBanner(); }
      return;
    }
    R.toast(lit(ne) && !wasLit ? nameOf(ne) + ' counts' : (wasLit || ne.dnc ? 'Saved' : nameOf(ne) + ' saved as a draft'), lit(ne) && !wasLit ? 'win' : '');
    if (another) R.go('contact', { id: null, from: p.from });
    else goBack(e ? p : { from: p.from });
  }

  /* ============================================================ the Sweep =============================== */
  R.screens.sweep = {
    mode: 'rep', bare: true,
    render: function (p) {
      if (!p.queue) p.queue = sweepIds(p.sid || null);
      p.i = p.i || 0;
      while (p.i < p.queue.length) { var x = byId(p.queue[p.i]); if (x && !gone(x) && !lit(x) && !x.dnc) break; p.i++; }
      var e = byId(p.queue[p.i]), d = D() || skeleton(), c = d.count || 0;
      if (!e) {
        var n = (p.saved || []).filter(function (id) { var y = byId(id); return y && lit(y); }).length;
        return '<main class="rep screen nonav"><div class="between"><span></span>' + syncNote() + '</div><h1>' + (n ? 'Done. ' + R.plural(n, 'tile') + ' lit.' : 'Done.') + '</h1><p class="muted">' + Math.min(c, 100) + '/100 contacts complete.</p>' +
          '<button class="btn primary" data-a="tab" data-k="home">Back to your Wall</button><button class="btn" data-a="tab" data-k="scenes">Another scene</button></main>';
      }
      var head = p.sid ? 'Light them up: ' + R.plural(p.queue.length, 'draft') + ' from this scene.' : 'Finish your drafts: ' + (p.queue.length - p.i) + ' to go.';
      return '<main class="rep screen nonav"><div class="between"><button class="link" data-a="tab" data-k="home">Close</button><span class="row-end">' + syncNote() + '<span class="small muted">' + (p.i + 1) + ' of ' + p.queue.length + ' · ' + Math.min(c, 100) + '/100</span></span></div>' +
        '<p class="caps">' + esc(head) + '</p>' + formHTML(e, 'sweep', p) + '</main>';
    },
    after: function (p) { bindForm(p); }
  };
  R.actions['sweep-all'] = function () { R.go('sweep', { queue: sweepIds(null), i: 0, sid: null }); };
  function sweepSave() {
    var p = R.view.p, f = document.getElementById('cForm');
    if (!f) return;
    var e = byId(f.dataset.id), vals = formVals();
    if (!e || !validate(vals)) return;
    var pl = buildPayload(vals, e), wasLit = lit(e);
    var ne = localApply(pl);
    p.draft = null;
    R.outbox.add(pl);
    if (lit(ne) && !wasLit) {
      fx.done[ne.id] = true; R.haptic();
      (p.saved = p.saved || []).push(ne.id);
      p.doneHere = (p.doneHere || 0) + 1;
      if (p.doneHere >= 20) awardBadge('clean_sweep');
    }
    if (held(ne)) { R.render(); scrollToBanner(); return; }
    p.i++; R.render(); try { window.scrollTo(0, 0); } catch (x) {}
  }
  R.actions['sw-skip'] = function () {
    var p = R.view.p, f = document.getElementById('cForm'), e = f && f.dataset.id ? byId(f.dataset.id) : null;
    if (e) {
      var vals = formVals(), pl = { id: e.id }, any = false;
      if (vals.last_name !== null && trim(vals.last_name) && trim(vals.last_name).length <= 60) { pl.last_name = trim(vals.last_name).replace(/\s+/g, ' '); any = true; }
      if (vals.phone !== null && R.phoneOk(R.normPhone(vals.phone))) { pl.phone = R.normPhone(vals.phone); any = true; }
      if (vals.handle !== null && cleanHandle(vals.handle) && vals.platform && (vals.platform !== 'Other' || trim(vals.other_app))) {
        pl.handle = cleanHandle(vals.handle); pl.platform = vals.platform; pl.other_app = vals.platform === 'Other' ? trim(vals.other_app) : ''; any = true;
      }
      if (any) {
        var ne = localApply(pl);
        R.outbox.add(pl);
        var m = missingOf(ne);
        if (m.length && !held(ne)) R.toast('Draft, ' + m.length + ' to go: ' + m.join(', ').toLowerCase() + '.');
      }
    }
    p.draft = null; p.i++; R.render(); try { window.scrollTo(0, 0); } catch (x) {}
  };

  /* ============================================================ possible duplicates ===================== */
  function resolveDup(id, decision, reason, btn) {
    whenSynced(id).then(function (ok) {
      if (!ok) { R.toast(R.say('offline'), 'bad'); return; }
      R.call('resolve_duplicate', { p_entry: id, p_decision: decision, p_reason: reason }, btn).then(function (res) {
        if (!res) return;
        R.closeSheet();
        var d = D();
        if (decision === 'same' && d && (!res.entry || res.entry.id !== id)) {
          for (var i = 0; i < d.entries.length; i++) if (d.entries[i].id === id) { d.entries.splice(i, 1); break; }
        }
        applyResult(res);
        dirty = true;
        var o = res.entry || byId(id);
        if (decision === 'same') R.toast('Merged. ' + firstOf(o) + ' counts once.', 'win');
        else R.toast(o && lit(o) ? 'Kept both. Both count.' : 'Kept both.', o && lit(o) ? 'win' : '');
        if (R.view.name === 'sweep') { R.view.p.draft = null; R.view.p.i++; R.render(); }
        else if (R.view.name === 'contact') { if (decision === 'same' && o && o.id !== id) R.go('contact', { id: o.id, from: R.view.p.from }); else R.render(); }
        load().then(function () { refreshView(); });
      });
    });
  }
  R.actions['dup-same'] = function (b) { resolveDup(b.dataset.id, 'same', null, b); };
  R.actions['dup-diff'] = function (b) {
    sheet('<h2>Different people?</h2><p class="muted">Tell your leader why, for example: brothers share a phone.</p><div class="field"><label for="fReason">Why two people?</label><input id="fReason" maxlength="200" placeholder="e.g. brothers share a phone" autofocus></div>' +
      '<p class="err" id="eReason" aria-live="polite"></p><div class="row"><button class="btn" data-a="sheet-close">Cancel</button><button class="btn primary" data-a="dup-diff-ok" data-id="' + esc(b.dataset.id) + '">Keep both</button></div>');
  };
  R.actions['dup-diff-ok'] = function (b) {
    var r = trim(val('fReason'));
    if (!r) { setText('eReason', 'Add a reason so your leader understands.'); return; }
    resolveDup(b.dataset.id, 'different', r, b);
  };
  R.actions['dup-fix'] = function (b) {
    if (R.view.name === 'contact') {
      var x = byId(b.dataset.id), h = document.getElementById(x && heldBy(x) === 'person' ? 'fPhone' : 'fHandle') || document.getElementById('fHandle');
      if (h) { try { h.focus(); h.select(); } catch (e) {} }
      return;
    }
    R.go('contact', { id: b.dataset.id, from: 'network' });
  };

  /* ============================================================ remove and restore ====================== */
  R.actions['c-remove'] = function (b) {
    var e = byId(b.dataset.id);
    if (!e) return;
    var d = D(), c = (d && d.count) || 0, counted = lit(e), f = firstOf(e), i = introFor(e.id), lr = d && d.list_reward, html;
    if (isDraft(e)) html = '<h2>Remove this draft?</h2><p class="muted">It was not counted.</p>';
    else {
      var n = counted ? c - 1 : c;
      html = '<h2>Remove ' + esc(nameOf(e)) + '?</h2><p class="muted">' + (counted ? (n >= 100 ? 'Your Wall stays complete. ' : 'Your count drops to ' + n + '. ') : 'Your count stays at ' + Math.min(c, 100) + '. ') +
        'XP you already earned stays, and adding ' + esc(f) + ' again won’t earn it twice. The RALLY recruiting team keeps the record and any recruiting history.</p>';
      if (counted && n < 100 && lr && !lr.reversed && (lr.status === 'ready' || lr.status === 'needs_correction')) html += '<p class="muted">Your list reward is under review. Going below 100 pauses that review until you’re back at 100.</p>';
      if (i && onBoard(i) && i.stage && i.stage !== 'added') html += '<p class="muted">' + esc(f) + ' is in recruiting (' + esc(R.STAGE_LABEL[i.stage] || i.stage) + '). Removing them from your Wall does not remove them from the RALLY recruiting team’s records.</p>';
    }
    sheet(html + '<div class="row"><button class="btn" data-a="sheet-close">Keep</button><button class="btn danger" data-a="c-remove-ok" data-id="' + esc(e.id) + '">Remove</button></div>');
  };
  R.actions['c-remove-ok'] = function (b) {
    var id = b.dataset.id;
    whenSynced(id).then(function (ok) {
      if (!ok) { R.toast(R.say('offline'), 'bad'); return; }
      R.call('remove_entry', { p_entry: id }, b).then(function (res) {
        if (!res) return;
        R.closeSheet();
        applyResult(res);
        var e = byId(id);
        if (e) e.removed = true;
        dirty = true;
        R.toast('Removed. Your count is ' + Math.min((D() && D().count) || 0, 100) + '.');
        R.go('network');
        load().then(function () { refreshView(); });
      });
    });
  };
  R.actions['c-restore'] = function (b) {
    var id = b.dataset.id;
    R.call('restore_entry', { p_entry: id }, b).then(function (res) {
      if (!res) return;
      applyResult(res);
      dirty = true;
      var e = byId(id);
      R.toast(e && held(e) ? 'Restored. Check: possible duplicate.' : 'Restored. No XP the second time.');
      R.render();
      load().then(function () { refreshView(); });
    });
  };

  /* ============================================================ My Network ============================== */
  function netCountsText() { var d = D() || skeleton(); return d.count + ' complete · ' + R.plural(d.drafts, 'draft') + ' · ' + d.held + ' to check'; }
  R.screens.network = {
    mode: 'rep', nav: 'rep',
    render: function (p) {
      var d = D();
      if (!d) return loadingHTML();
      var f = p.f || 'all', dncs = live().filter(function (e) { return e.dnc; }).length;
      var filters = [['all', 'All'], ['done', 'Complete'], ['draft', 'Drafts'], ['held', 'To check'], ['intro', 'In intros']].concat(dncs || f === 'dnc' ? [['dnc', 'Do not contact']] : []).concat([['removed', 'Removed']]);
      return '<main class="rep screen"><div class="between"><h1>My Network</h1><button class="btn sm auto" data-a="net-add">+ Add</button></div>' +
        (d._skeleton ? '<p class="small muted">No signal. Your full list loads when you’re back online.</p>' : '<p class="small muted" id="netCounts">' + esc(netCountsText()) + '</p>') +
        '<label class="sr" for="netSearch">Search contacts</label><input class="search" id="netSearch" type="search" placeholder="Search name, handle or phone" value="' + esc(p.q || '') + '" autocomplete="off" autocapitalize="none" spellcheck="false">' +
        '<div class="chips scroll" role="group" aria-label="Show">' + filters.map(function (x) { return '<button class="cbtn' + (f === x[0] ? ' on' : '') + '" data-a="net-filter" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div id="netHead"></div><div id="netList" class="stack"></div></main>';
    },
    after: function (p) {
      var s = document.getElementById('netSearch');
      if (s) s.addEventListener('input', function () { p.q = s.value; netList(p); });
      netList(p);
      restoreFocus(p);
      ensure();
    }
  };
  function netCard(e) {
    var sc = e.scene ? R.scene(e.scene) : null, i = introFor(e.id), line;
    if (e._pending) line = 'Confirming with RALLY';
    else if (e.dnc) line = dncLine(firstOf(e));
    else if (held(e)) line = 'Might be the same person as ' + (e.held_of_name || 'another contact') + '. Tap to check.';
    else if (lit(e)) line = (e.tags && e.tags.length ? e.tags.join(', ') : (sc ? sc.name : ''));
    else if (!e.removed) line = 'Missing: ' + missingOf(e).join(', ');
    else line = '';
    var rec = !onBoard(i) ? '' : (creditedElsewhere(i) ? '<span class="small"><span class="chip">Introduced</span> The referral reward went to another rep who introduced them first.</span>'
      : '<span class="small"><span class="chip">' + esc(stageChip(i)) + '</span> ' + esc(nextLine(i)) + '</span>');
    var sub = 'Added ' + R.date(e.created_at) + (e.kept_with && e.kept_with.length ? ' · Kept both' : '');
    return '<button class="ncard' + (e.dnc ? ' dnc' : '') + '" data-a="net-open" data-id="' + esc(e.id) + '"><span class="top-row"><span class="nm">' + esc(nameOf(e)) + '</span>' + statusChip(e, true) + '</span>' +
      (line ? '<span class="small muted">' + esc(line) + '</span>' : '') + rec + '<span class="small dim">' + esc(sub) + '</span></button>';
  }
  function netList(p) {
    var box = document.getElementById('netList'), head = document.getElementById('netHead');
    if (!box) return;
    var f = p.f || 'all', raw = trim(p.q), q = raw.toLowerCase(), qd = q.replace(/\D/g, ''), qh = R.normHandle(q);
    var src = f === 'removed' ? all().filter(function (e) { return e.removed && !e.merged_into; }) : live();
    var list = src.filter(function (e) {
      if (f === 'done' && !lit(e)) return false;
      if (f === 'draft' && !isDraft(e)) return false;
      if (f === 'held' && !held(e)) return false;
      if (f === 'dnc' && !e.dnc) return false;
      if (f === 'intro' && !onBoard(introFor(e.id))) return false;
      if (!q) return true;
      return nameOf(e).toLowerCase().indexOf(q) >= 0 || (qd.length >= 3 && String(e.phone || '').indexOf(qd) >= 0) || (!!qh && R.normHandle(e.handle).indexOf(qh) >= 0);
    });
    if (f === 'draft') list.sort(function (a, b) { return missingOf(a).length - missingOf(b).length || byCreated(a, b); });
    else list.sort(function (a, b) { return ts(b.created_at) - ts(a.created_at); });
    if (head) head.innerHTML = f === 'draft' && list.length ? '<div class="between"><p class="small muted">' + R.plural(list.length, 'draft') + '. Fewest missing first.</p><button class="btn xs" data-a="sweep-all">Finish all drafts</button></div>'
      : (f === 'removed' ? '<p class="small muted">Removed contacts stay in RALLY’s records. Adding one back never earns XP or a reward twice.</p>' : '');
    if (!list.length) {
      if (q) box.innerHTML = '<p class="muted">No match for ‘' + esc(raw) + '’.</p>' + (/[a-z]/i.test(raw) && raw.length <= 121 ? '<button class="btn" data-a="net-add-name" data-v="' + esc(raw) + '">Add ' + esc(raw) + ' as a new contact</button>' : '');
      else if (!live().length && f !== 'removed') box.innerHTML = '<p class="muted">No contacts yet. Enter a Scene to add your first names.</p><button class="btn primary" data-a="tab" data-k="scenes">Enter a Scene</button>';
      else box.innerHTML = '<p class="muted">Nothing here.</p>';
      return;
    }
    box.innerHTML = list.slice(0, 500).map(netCard).join('');
  }
  function netRefresh() { setText('netCounts', netCountsText()); netList(R.view.p); }
  R.actions['net-filter'] = function (b) { R.view.p.f = b.dataset.v; R.render(); };
  R.actions['net-open'] = function (b) { R.go('contact', { id: b.dataset.id, from: 'network' }); };
  R.actions['net-add'] = function () { R.go('contact', { id: null, from: R.view.name === 'network' ? 'network' : 'home' }); };
  R.actions['net-add-name'] = function (b) {
    var parts = trim(b.dataset.v).split(/\s+/), first = parts.shift() || '', last = parts.join(' ');
    R.go('contact', { id: null, from: 'network', draft: { id: 'new', v: { first_name: first, last_name: last } } });
  };

  /* ============================================================ Introductions =========================== */
  function boardCard(i) {
    var e = byId(i.entry_id), n = confirmedCount(i), other = creditedElsewhere(i);
    return '<button class="ncard" data-a="intro-open" data-id="' + esc(i.entry_id) + '"><span class="top-row"><span class="nm">' + esc(nameOf(i.name ? i : e)) + '</span><span class="chip">' + esc(other ? 'Introduced' : stageChip(i)) + '</span></span>' +
      (hasReqs(i) && !other ? '<span class="small">' + n + ' of 4 confirmed</span>' : '') + '<span class="small muted">' + esc(other ? 'The referral reward went to another rep who introduced them first.' : (nextLine(i) || introStatus(i, firstOf(i.name ? i : e)))) + '</span>' +
      (e && e.removed ? '<span class="chips"><span class="chip">Removed from your Wall</span></span>' : '') + '</button>';
  }
  R.screens.intros = {
    mode: 'rep', nav: 'rep',
    render: function () {
      var d = D();
      if (!d) return loadingHTML();
      if (d._skeleton) return '<main class="rep screen"><h1>Introductions</h1>' + offlineCard('Your Intro Board loads when you’re back online.') + '</main>';
      var board = introList().filter(onBoard), wait = waiting(), ready = readyList();
      var h = '<main class="rep screen"><div><h1>Introductions</h1><p class="muted">Available from your first contact. You don’t need 100 to introduce someone.</p></div>';
      if (wait.length) h += '<button class="strip tapstrip" data-a="intro-open" data-id="' + esc(wait[0].entry_id) + '"><div><b>' + wait.length + ' waiting on you</b><div class="muted">' + esc(nameOf(wait[0]) + ': ' + (nextLine(wait[0]) || introStatus(wait[0], firstOf(wait[0])))) + '</div></div></button>';
      h += '<p class="small dim">You make the intro yourself: text, call or in person. RALLY only keeps track. Adding someone here never messages them.</p>';
      h += '<section class="stack"><div class="between"><span class="caps">Ready to introduce</span>' + (ready.length ? '<button class="link small" data-a="intro-pick">Search</button>' : '') + '</div>' +
        (ready.length ? '<div class="chips scroll">' + ready.slice(0, 15).map(function (e) { return '<button class="cbtn" data-a="intro-open" data-id="' + esc(e.id) + '">' + esc(nameOf(e)) + '</button>'; }).join('') + '</div>'
          : '<p class="small muted">Complete contacts show up here. A draft needs all four fields before you can introduce them.</p>') + '</section>';
      if (!board.length) {
        h += '<div class="card flat"><p>No introductions yet. Pick someone from your Wall who would actually take a meeting.</p>' + (ready.length ? '<button class="btn primary" data-a="intro-pick">Introduce someone</button>' : '<button class="btn primary" data-a="tab" data-k="network">Finish a contact</button>') + '</div>';
      } else {
        var groups = R.STAGES.slice(1).map(function (s) {
          var items = board.filter(function (i) { return !i.outcome && (i.stage === s || (s === 'intro_planned' && (i.stage === 'added' || !i.stage))); });
          return items.length ? '<section class="stack"><div class="caps">' + esc(R.STAGE_LABEL[s]) + '</div>' + items.map(boardCard).join('') + '</section>' : '';
        }).join('');
        var outs = board.filter(function (i) { return i.outcome; });
        h += groups + (outs.length ? '<section class="stack"><div class="caps">Outcomes</div>' + outs.map(boardCard).join('') + '</section>' : '');
      }
      return h + '</main>';
    },
    after: function () { ensure(); }
  };
  function canFollowUp(i, e) {
    if (!e || gone(e) || e.dnc || !e.person_id || (i && (i.outcome === 'do_not_contact' || i.outcome === 'not_interested'))) return false;
    var s = i && i.stage ? i.stage : 'added';
    return !myIntro(i) ? lit(e) : (s === 'added' || s === 'intro_planned' || s === 'introduced');
  }
  R.screens.intro = {
    mode: 'rep', nav: 'rep', tab: 'intros',
    render: function (p) {
      var d = D();
      if (!d) return loadingHTML();
      var e = byId(p.id), i = introFor(p.id);
      var back = '<div class="between"><button class="link" data-a="tab" data-k="intros">Introductions</button></div>';
      if (!e && !i) return '<main class="rep screen">' + back + (d._skeleton ? offlineCard('This introduction loads when you’re back online.') : '<div class="card"><h2>That introduction isn’t available.</h2></div>') + '</main>';
      var f = firstOf(e || i), L = leaderName(i), dnc = (e && e.dnc) || (i && i.outcome === 'do_not_contact'), other = !dnc && creditedElsewhere(i);
      var h = '<main class="rep screen">' + back + '<div class="between"><h1 class="iname">' + esc(nameOf(i && i.name ? i : e)) + '</h1>' + (onBoard(i) ? '<span class="chip">' + esc(other ? 'Introduced' : stageChip(i)) + '</span>' : '') + '</div>';
      if (e && e.removed) h += '<div class="chips"><span class="chip">Removed from your Wall</span></div>';
      if (dnc) {
        h += '<div class="card"><p>' + esc(dncLine(f)) + '</p><p class="small muted">No introduction actions are available.</p></div>';
      } else if (other) {
        h += '<div class="card"><p>' + esc(otherLine(i)) + '</p></div>';
      } else if (e && held(e)) {
        h += '<div class="card"><p>Sort out the possible duplicate first.</p><button class="btn primary" data-a="net-open" data-id="' + esc(e.id) + '">Open ' + esc(f) + '</button></div>';
      } else if (!onBoard(i)) {
        if (!e || !lit(e)) h += '<div class="card"><p>Finish this contact to introduce them.</p>' + (e ? '<button class="btn primary" data-a="intro-finish" data-id="' + esc(e.id) + '">Finish ' + esc(f) + '</button>' : '') + '</div>';
        else h += '<div class="card"><p>' + esc(f) + ' is on your Wall. Tell ' + esc(f) + ' about RALLY your way, then record it here so ' + esc(L || 'your leader') + ' can set up the meeting.</p>' +
          '<button class="btn primary" data-a="ri-open" data-id="' + esc(e.id) + '">I introduced ' + esc(f) + '</button><button class="btn" data-a="plan" data-id="' + esc(e.id) + '">I’ll introduce ' + esc(f) + '</button>' +
          '<p class="small dim">RALLY doesn’t message ' + esc(f) + '. Adding someone here never messages them.</p></div>';
      } else {
        var status = introStatus(i, f), next = nextLine(i);
        if (i.status === 'planned' && i.next && i.next.who === 'you' && !i.outcome) next = 'Next: you, tell ' + f + ' about RALLY and that ' + (L || 'your leader') + ' will text them. Then come back and tap ‘I introduced ' + f + '’.';
        h += '<div class="card"><p>' + esc(status) + '</p>' + (next ? '<p><b>' + esc(next) + '</b></p>' : '') +
          (i.interest && i.interest !== 'unknown' && myIntro(i) ? '<p class="small muted">Interest: ' + esc(R.INTEREST_LABEL[i.interest] || i.interest) + '</p>' : '') +
          (R.STAGES.indexOf(i.stage) >= 3 ? '<p class="small muted">' + esc((L || 'Your leader') + ' runs this from here. You can still fix ' + f + '’s phone, handle, tags and your notes.') + '</p>' : '') + '</div>';
        if (i.status === 'planned' && e && !gone(e)) h += '<button class="btn primary" data-a="ri-open" data-id="' + esc(e.id) + '">I introduced ' + esc(f) + '</button><button class="btn" data-a="copy-msg" data-id="' + esc(p.id) + '">Copy a message</button>';
        if (hasReqs(i)) h += '<section class="card"><div class="caps">' + confirmedCount(i) + ' of 4 confirmed</div>' + reqRows(i.requirements) +
          '<p class="small dim">All 4 need ' + esc(L ? L + '’s' : 'your leader’s') + ' confirmation before your referral reward goes to review.</p></section>';
      }
      if (!dnc && !other && canFollowUp(i, e)) h += '<button class="btn" data-a="fu-open" data-id="' + esc(p.id) + '">Follow up later</button>';
      if (e && !gone(e) && e.person_id) h += '<button class="btn ghost" data-a="tl-open" data-id="' + esc(p.id) + '">Something wrong? Tell ' + esc(L || 'your leader') + '</button>';
      if (e) h += '<button class="btn ghost" data-a="intro-edit" data-id="' + esc(e.id) + '">Edit ' + esc(f) + '’s contact</button>';
      return h + '</main>';
    },
    after: function () { ensure(); }
  };
  R.actions['intro-open'] = function (b) { R.closeSheet(); R.go('intro', { id: b.dataset.id }); };
  R.actions['intro-finish'] = function (b) { R.go('contact', { id: b.dataset.id, from: 'intro' }); };
  R.actions['intro-edit'] = function (b) { R.go('contact', { id: b.dataset.id, from: 'intro' }); };
  R.actions['intro-pick'] = function () {
    var list = readyList();
    sheet('<h2>Introduce someone</h2><p class="muted">Pick someone from your Wall who would actually take a meeting.</p>' +
      '<label class="sr" for="pkSearch">Search your complete contacts</label><input class="search" id="pkSearch" type="search" placeholder="Search your complete contacts" autocomplete="off">' +
      '<div class="stack pk-list" id="pkList"></div><button class="btn ghost" data-a="sheet-close">Close</button>');
    var input = document.getElementById('pkSearch');
    function draw() {
      var q = trim(input && input.value).toLowerCase(), box = document.getElementById('pkList');
      if (!box) return;
      var rows = list.filter(function (e) { return !q || nameOf(e).toLowerCase().indexOf(q) >= 0; }).slice(0, 60);
      box.innerHTML = rows.length ? rows.map(function (e) {
        return '<button class="ncard" data-a="intro-open" data-id="' + esc(e.id) + '"><span class="nm">' + esc(nameOf(e)) + '</span>' + (e.tags && e.tags.length ? '<span class="small muted">' + esc(e.tags.join(', ')) + '</span>' : '') + '</button>';
      }).join('') : '<p class="muted">' + (list.length ? 'No match.' : 'No complete contacts ready to introduce yet. Finish a contact first.') + '</p>';
    }
    if (input) input.addEventListener('input', draw);
    draw();
  };
  function introWrite(fn, params, btn, msg) {
    return whenSynced(params.p_entry).then(function (ok) {
      if (!ok) { R.toast(R.say('offline'), 'bad'); return null; }
      return R.call(fn, params, btn).then(function (res) {
        if (!res) return null;
        if (res.intro) mergeIntro(res.intro);
        R.closeSheet();
        if (msg) R.toast(msg);
        dirty = true;
        setNavBadge();
        refreshView();
        load().then(function () { refreshView(); });
        return res;
      });
    });
  }
  R.actions.plan = function (b) {
    var id = b.dataset.id, f = firstOf(byId(id));
    introWrite('plan_intro', { p_entry: id }, b, 'Introduction planned. Next: you, tell ' + f + ' about RALLY.');
  };
  R.actions['copy-msg'] = function (b) {
    var L = leaderName(introFor(b.dataset.id));
    R.copy('Hey, I’m working with RALLY this summer. Cool if my leader' + (L ? ' ' + L : '') + ' texts you about it?');
  };
  R.actions['ri-open'] = function (b) {
    var id = b.dataset.id, e = byId(id), i = introFor(id), f = firstOf(e || i), L = leaderName(i), today = R.today();
    sheet('<h2>I introduced ' + esc(f) + '</h2>' +
      '<div class="field"><span class="lbl" id="riHowL">How?</span><div class="chips" role="group" aria-labelledby="riHowL">' + HOW.map(function (c) { return '<button type="button" class="cbtn" data-a="ri-pick" data-g="how" data-v="' + c[0] + '" aria-pressed="false">' + c[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="lbl" id="riSaidL">What did ' + esc(f) + ' say?</span><div class="chips" role="group" aria-labelledby="riSaidL">' + SAID.map(function (c) { return '<button type="button" class="cbtn" data-a="ri-pick" data-g="said" data-v="' + c[0] + '" aria-pressed="false">' + c[1] + '</button>'; }).join('') + '</div></div>' +
      '<p class="small muted" id="riWhen">Date: today. <button type="button" class="link small" data-a="ri-date">Not today? Change date</button></p>' +
      '<div class="field" id="riDateWrap" hidden><label for="riDate">Date</label><input type="date" id="riDate" value="' + today + '" max="' + today + '"></div>' +
      '<details><summary class="caps sum">Add a note</summary><div class="field"><label class="sr" for="riNote">Note</label><textarea id="riNote" maxlength="1000" placeholder="Anything your leader should know"></textarea></div></details>' +
      '<p class="err" id="riErr" aria-live="polite"></p>' +
      '<button class="btn primary" data-a="ri-save" data-id="' + esc(id) + '" id="riSave" aria-disabled="true">' + esc(L ? 'Done, ' + L + '’s up' : 'Done, your leader’s up') + '</button>' +
      '<p class="small dim">RALLY doesn’t message ' + esc(f) + '. You make the intro your way, then tap this so your leader can set up the meeting.</p>' +
      '<button class="btn ghost" data-a="sheet-close">Cancel</button>');
  };
  R.actions['ri-pick'] = function (b) {
    var sh = b.closest('.sheet');
    Array.prototype.forEach.call(sh.querySelectorAll('[data-a="ri-pick"][data-g="' + b.dataset.g + '"]'), function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    var ready = sh.querySelector('[data-g="how"].on') && sh.querySelector('[data-g="said"].on'), s = document.getElementById('riSave');
    if (s) s.setAttribute('aria-disabled', ready ? 'false' : 'true');
    setText('riErr', '');
  };
  R.actions['ri-date'] = function () { var w = document.getElementById('riDateWrap'); if (w) w.hidden = false; var wh = document.getElementById('riWhen'); if (wh) wh.hidden = true; var i = document.getElementById('riDate'); if (i) try { i.focus(); } catch (e) {} };
  R.actions['ri-save'] = function (b) {
    var sh = b.closest('.sheet'), how = sh.querySelector('[data-g="how"].on'), said = sh.querySelector('[data-g="said"].on');
    if (!how || !said) { setText('riErr', 'Pick one answer in each row.'); return; }
    /* left at "today", the date is the server's org day (one date policy); a changed date is sent as picked */
    var wrap = document.getElementById('riDateWrap'), date = wrap && !wrap.hidden ? (val('riDate') || null) : null, note = trim(val('riNote'));
    if (date && date > R.today()) { setText('riErr', 'Pick today or an earlier day.'); return; }
    var id = b.dataset.id, f = firstOf(byId(id) || introFor(id)), L = leaderName(introFor(id));
    introWrite('record_intro', { p_entry: id, p_channel: how.dataset.v, p_said: said.dataset.v, p_note: note || null, p_date: date }, b,
      f + ' is on your Intro Board. Next: ' + (L || 'your leader') + ' schedules the meeting.').then(function (res) { if (res && R.view.name !== 'intro') R.go('intro', { id: id }); });
  };
  R.actions['fu-open'] = function (b) {
    var id = b.dataset.id, f = firstOf(byId(id) || introFor(id));
    sheet('<h2>Follow up later</h2><p class="muted">Pick a day to check back with ' + esc(f) + '. Nothing is sent to ' + esc(f) + '.</p>' +
      '<div class="field"><label for="fuDate">Date</label><input type="date" id="fuDate" value="' + addDays(7) + '" min="' + R.today() + '"></div>' +
      '<div class="field"><label for="fuNote">Note (optional)</label><textarea id="fuNote" maxlength="500" placeholder="e.g. ask again after finals"></textarea></div>' +
      '<p class="err" id="fuErr" aria-live="polite"></p><div class="row"><button class="btn" data-a="sheet-close">Cancel</button><button class="btn primary" data-a="fu-save" data-id="' + esc(id) + '">Save</button></div>');
  };
  R.actions['fu-save'] = function (b) {
    var id = b.dataset.id, date = val('fuDate'), note = trim(val('fuNote')), f = firstOf(byId(id) || introFor(id));
    if (!date) { setText('fuErr', R.say('date_required')); return; }
    if (date < R.today()) { setText('fuErr', 'Pick today or a later day.'); return; }
    introWrite('set_follow_up', { p_entry: id, p_date: date, p_note: note || null }, b, 'Follow up with ' + f + ' on ' + R.date(date) + '.');
  };
  R.actions['tl-open'] = function (b) {
    var id = b.dataset.id, f = firstOf(byId(id) || introFor(id)), L = leaderName(introFor(id)) || 'your leader';
    sheet('<h2>Tell ' + esc(L) + '</h2><p class="muted">Wrong number, asked not to be contacted, anything ' + esc(L) + ' should know about ' + esc(f) + '.</p>' +
      '<div class="field"><label for="tlBody">Message</label><textarea id="tlBody" maxlength="1000" placeholder="What should ' + esc(L) + ' know?" autofocus></textarea></div>' +
      '<p class="err" id="tlErr" aria-live="polite"></p><div class="row"><button class="btn" data-a="sheet-close">Cancel</button><button class="btn primary" data-a="tl-send" data-id="' + esc(id) + '">Send</button></div>');
  };
  R.actions['tl-send'] = function (b) {
    var id = b.dataset.id, body = trim(val('tlBody')), L = leaderName(introFor(id)) || 'your leader';
    if (!body) { setText('tlErr', 'Write a short message first.'); return; }
    introWrite('tell_leader', { p_entry: id, p_body: body }, b, 'Sent to ' + L + '. They’ll see it in their next actions.');
  };

  /* ============================================================ My Rewards ============================== */
  function refRow(x, d) {
    var name = trim(x.name) || 'Your friend', f = name.split(' ')[0], n = confirmedCount(x), i = introByPerson(x.person_id), L = leaderName(i), txt, stamped = false, checks = true;
    if (x.credited === 'other') { txt = name + ': Another rep who also knows ' + f + ' introduced them first, so the referral reward goes to them. ' + f + ' still counts toward your 100. Questions? Ask your leader.'; checks = false; }
    else if (x.reversed) txt = name + ': Referral reward reversed.' + (trim(x.rep_reason) ? ' Reason: ' + sentence(x.rep_reason) : '');
    else if (x.status === 'paid') { txt = name + ': ' + amount(x) + '. Pay issued ' + R.date(x.paid_on) + '.'; stamped = true; }
    else if (x.status === 'approved') { txt = name + ': Referral reward ' + amount(x) + ' · Pending pay. Nothing needed from you.'; stamped = true; }
    else if (x.status === 'needs_correction') txt = name + ': Needs correction. ' + (L ? 'Leader ' + L : 'Your leader') + ' is fixing it. Nothing needed from you.';
    else if (x.status === 'ready') txt = name + ': 4 of 4 confirmed. Congratulations! Show this to your leader to confirm your prize!';
    else if (i && (i.outcome === 'not_interested' || i.outcome === 'do_not_contact')) txt = name + ': Not moving forward. No referral reward.';
    else if (i && i.outcome === 'follow_up') txt = name + ': On hold. ' + n + ' of 4 confirmed.';
    else {
      var still = Array.isArray(x.requirements) && x.requirements.length ? [1, 2, 3, 4].filter(function (k) { var r = reqOf(x.requirements, k); return !(r && r.confirmed); }).map(function (k) { return R.REQ_LABEL[k]; }) : [];
      txt = name + ': ' + n + ' of 4 confirmed.' + (still.length ? ' Still needed: ' + still.join(', ') + '.' : '') + ' Next action: ' + (L ? 'Leader ' + L : 'your leader') + '.';
    }
    return '<div class="rw-row"><div class="rw-line">' + (stamped ? stampImg() : '') + '<p>' + esc(txt) + '</p></div>' + (checks && hasReqs(x) ? reqRows(x.requirements) : '') + '</div>';
  }
  var REF_RANK = { approved: 0, paid: 1, ready: 2, needs_correction: 3, in_progress: 3 };
  function refRank(x) {                    /* Pending pay and Pay issued rows first; they never disappear */
    if (x.credited === 'other') return 4;
    if (x.reversed) return 5;
    return REF_RANK[x.status] != null ? REF_RANK[x.status] : 3;
  }
  function awardRow(a) {
    var name = trim(a.name) || 'Incentive', txt, stamped = false;
    if (a.reversed) txt = name + ': Reversed.' + (trim(a.rep_reason) ? ' Reason: ' + sentence(a.rep_reason) : '');
    else if (a.status === 'paid') { txt = name + ': ' + R.money(a.amount_cents) + '. Pay issued ' + R.date(a.paid_on) + '.'; stamped = true; }
    else if (a.status === 'approved') { txt = name + ': ' + R.money(a.amount_cents) + ' · Pending pay. Nothing needed from you.'; stamped = true; }
    else txt = name + ': ' + (R.STATUS_LABEL[a.status] || 'In progress') + '.';
    return '<div class="rw-row"><div class="rw-line">' + (stamped ? stampImg() : '') + '<p>' + esc(txt) + '</p></div></div>';
  }
  function totalsHTML(d) {
    var pend = 0, paid = 0;
    function add(r, cents) { if (!r || r.reversed) return; if (r.status === 'approved') pend += cents; else if (r.status === 'paid') paid += cents; }
    if (d.list_reward) add(d.list_reward, d.list_reward.amount_cents != null ? d.list_reward.amount_cents : 10000);
    d.referrals.forEach(function (x) { if (x.credited !== 'other') add(x, x.amount_cents != null ? x.amount_cents : 10000); });
    d.awards.forEach(function (a) { add(a, Number(a.amount_cents) || 0); });
    return pend || paid ? '<p class="totals">Pending pay: ' + esc(R.money(pend)) + ' · Pay issued: ' + esc(R.money(paid)) + '</p>' : '';
  }
  R.screens.rewards = {
    mode: 'rep', nav: 'rep',
    render: function () {
      var d = D();
      if (!d) return loadingHTML();
      if (d._skeleton) return '<main class="rep screen"><h1>My Rewards</h1>' + offlineCard('Your rewards load when you’re back online.') + '</main>';
      var c = d.count || 0, r = d.list_reward, st = r ? r.status : 'in_progress', stamped = !!(r && !r.reversed && (st === 'approved' || st === 'paid')), chip;
      if (r && r.reversed) chip = '<span class="chip">Reversed</span>';
      else if (st === 'paid') chip = '<span class="chip win">Pay issued</span>';
      else if (st === 'approved') chip = '<span class="chip win">Pending pay</span>';
      else if (st === 'needs_correction') chip = '<span class="chip">Needs correction</span>';
      else if (st === 'ready' && r.hold) chip = '<span class="chip">On hold (' + Math.min(c, 100) + '/100)</span>';
      else if (st === 'ready') chip = '<span class="chip">Ready for review</span>';
      else chip = '<span class="chip">In progress</span>';
      var btn = r && !r.reversed && st === 'ready' && !r.hold ? '<button class="btn primary" data-a="congrats">Show your leader</button>'
        : (r && !r.reversed && st === 'needs_correction' && d.held ? '<button class="btn" data-a="net-filter-go" data-v="held">Fix duplicates</button>' : '');
      var list = '<section class="card' + (stamped ? ' win' : '') + '"><div class="between rw-head"><h2>List Completion Reward · $100</h2>' + chip + '</div><div class="rw-line">' + (stamped ? stampImg() : '') + '<p>' + esc(listLine(d)) + '</p></div>' + btn + '</section>';
      var refs = d.referrals.slice().sort(function (a, b) { return refRank(a) - refRank(b); });
      var ref = '<section class="card"><h2>Referral rewards</h2><p class="muted">Referral rewards: $100 per qualifying friend.</p>' +
        (refs.length ? refs.map(function (x) { return refRow(x, d); }).join('') : '<p class="muted">Friends you introduce show up here once they’re on your Intro Board.</p>') + '</section>';
      var inc = '<section class="card"><h2>Incentives</h2>' + (d.incentives.length ? d.incentives.map(function (x) {
        var src = coverOf(x);
        return '<div class="inc-card">' + (src ? '<img src="' + esc(src) + '" alt="">' : '<span class="ph" aria-hidden="true"></span>') + '<div class="stack tight"><b>' + esc(x.name) + '</b><span class="muted">Prize: ' + esc(R.money(x.prize_cents)) + '</span>' +
          (trim(x.how_to_earn) ? '<p class="small"><span class="dim">How to earn it:</span> ' + esc(x.how_to_earn) + '</p>' : '') + '</div></div>';
      }).join('') : '<p class="muted">Incentives from RALLY show up here, each with a picture, name and prize.</p>') +
        (d.awards.length ? '<div class="caps">Your incentive awards</div>' + d.awards.map(awardRow).join('') : '') + '</section>';
      return '<main class="rep screen"><h1>My Rewards</h1>' + list + ref + totalsHTML(d) + inc +
        '<p class="small dim">‘Pay issued’ means RALLY marked your pay as sent on that date. This app doesn’t send money. RALLY pays you directly.</p><button class="link small rules-link" data-a="rules">Reward rules</button></main>';
    },
    after: function () { ensure(); }
  };

  /* ============================================================ congratulations ========================= */
  R.screens.congrats = {
    mode: 'rep', bare: true,
    render: function (p) {
      var d = D() || skeleton(), c = d.count || 0, r = d.list_reward;
      var tiles = '';
      for (var i = 0; i < 100; i++) tiles += '<i style="animation-delay:' + (p.fresh ? i * 7 : 0) + 'ms"></i>';
      var signed = d.referrals.filter(function (x) {
        if (x.credited === 'other' || x.reversed) return false;
        var r3 = reqOf(x.requirements, 3);
        return (r3 && r3.confirmed) || x.status === 'ready' || x.status === 'approved' || x.status === 'paid';
      });
      var lits = litList(), fin = lits.length >= 100 ? lits[99].completed_at : null;
      var status = !r ? 'Ready for review' : (r.reversed ? 'Reversed' : (r.status === 'ready' && r.hold ? 'On hold' : (R.STATUS_LABEL[r.status] || 'Ready for review')));
      var msg = c >= 100 ? '100/100 complete. Congratulations! Show this to your leader and walk through your list and signed friends together to confirm your prize!' : listLine(d);
      return '<main class="rep screen nonav"><div class="cg"><div class="cg-wall" aria-hidden="true">' + tiles + '</div><img class="cg-stamp" src="' + R.PANTHER + '" alt="RALLY panther stamp"><div class="ruled">WALL COMPLETE</div>' +
        '<p class="msg">' + esc(msg) + '</p><div class="facts card"><div><span class="muted">Finished</span><span>' + esc(R.date(fin) || 'Today') + '</span></div><div><span class="muted">Complete contacts</span><span>' + c + '</span></div>' +
        '<div><span class="muted">Signed friends</span><span>' + (signed.length ? esc(signed.map(function (x) { return x.name; }).join(', ')) : 'None yet') + '</span></div><div><span class="muted">List reward</span><span>' + esc(status) + '</span></div></div>' +
        '<button class="btn primary" data-a="tab" data-k="home">Done</button></div></main>';
    },
    after: function () { if (!D()) ensure(); }
  };
})();
