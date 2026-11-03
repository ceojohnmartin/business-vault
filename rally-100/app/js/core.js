/* RALLY 100: shared core. Every screen module (rep.js, lead.js, owner.js) builds on this file.

   CONVENTIONS FOR SCREEN MODULES
   - Register screens:  R100.screens['name'] = { mode:'rep'|'lead'|'owner'|null, wide:bool, nav:'rep'|'lead'|'owner'|null,
                                                  render: function (p) { return htmlString; }, after: function (p) {} }
     `render` returns HTML for the area under the top bar; the top bar and nav are added by the core.
     Escape EVERY server or user string with R100.esc(). `after` binds anything that needs listeners.
   - Register click actions: R100.actions['prefix-name'] = function (el, ev) {}. Any element with
     data-a="prefix-name" runs it; a data-a element never submits a form. Use prefixes: rep screens none,
     leader 'lead-', owner 'own-'.
   - Register form submits: R100.forms['name'] = function (form, ev) {}; markup <form data-form="name">.
   - Navigate with R100.go('screen', params). Re-render the current screen with R100.render().
   - Server data: R100.load('rep'|'team'|'owner') fetches rep_state / team_state / owner_state into
     R100.data.rep|team|owner and returns it. R100.call(name, params, btn) wraps an RPC with a busy button
     and error toast; it resolves to the result or null on failure.
   - Wording: R100.say(code) maps a server code to plain words. Never show raw server text.
   - Money: R100.money(cents). Dates: R100.date(isoOrDate). Approved shows "Pending pay"; paid shows
     "Pay issued". Never show money as earned or pending before approval.
   - Rep list writes (save_entry) go through R100.outbox so names typed without signal are kept. */
(function () {
  var R = window.R100 = window.R100 || {};
  R.version = '1.0.0';

  /* ------------------------------------------------------------ fixed values ---------------------------- */
  R.PLATFORMS = ['Instagram', 'Snapchat', 'TikTok', 'Facebook', 'X', 'LinkedIn', 'Discord', 'Other'];
  R.TAGS = ['School', 'Sports', 'Work', 'Gym', 'Neighborhood', 'Family', 'Group chat', 'Hobbies/Clubs/Community', 'Lost touch', 'Other'];
  R.LEVELS = [['Rookie', 0], ['Scout', 150], ['Connector', 400], ['Operator', 800], ['Prowler', 1300], ['Apex', 2000]];
  R.MS = [10, 25, 50, 75, 100];
  R.MS_XP = { 10: 50, 25: 100, 50: 200, 75: 300, 100: 500 };
  R.MS_TEXT = {
    10: ['On the board', '10/100. On the board. First row lit.'],
    25: ['First quarter', '25 lit. Keep the run going.'],
    50: ['Half Wall', 'Half your Wall is lit. 50 to go. The $100 completion reward is for the full 100, no halfway cash.'],
    75: ['Home stretch', '25 to go.'],
    100: ['Wall complete', '100/100 complete.']
  };
  R.STAGES = ['added', 'intro_planned', 'introduced', 'meeting_scheduled', 'meeting_completed', 'commitment_confirmed', 'agreement_signed', 'start_confirmed', 'arrived'];
  R.STAGE_LABEL = {
    added: 'Added', intro_planned: 'Introduction planned', introduced: 'Introduced', meeting_scheduled: 'Meeting scheduled',
    meeting_completed: 'Meeting completed', commitment_confirmed: 'Commitment confirmed', agreement_signed: 'Agreement signed',
    start_confirmed: 'Start/travel plans confirmed', arrived: 'Arrived or started'
  };
  R.OUTCOME_LABEL = { follow_up: 'Follow up later', not_interested: 'Not interested', do_not_contact: 'Do not contact' };
  R.INTEREST_LABEL = { unknown: 'Unknown', interested: 'Interested', maybe: 'Maybe', not_interested: 'Not interested' };
  R.REQ_LABEL = { 1: 'Meeting completed', 2: 'Commitment confirmed', 3: 'Agreement signed', 4: 'Start date and travel plans confirmed' };
  R.STATUS_LABEL = { in_progress: 'In progress', ready: 'Ready for review', approved: 'Pending pay', paid: 'Pay issued', needs_correction: 'Needs correction' };
  R.SCENES = [
    { id: 'phone', name: 'Phone Sweep', line: "Flip to your Phone app: Recents, then Contacts A to Z. Then your Instagram followers. Come back and type everyone you'd text back. The timer waits.", cues: ['Your Recents, top to bottom.', 'Your pinned chats and favorites.'], chains: ["Who's on your Snapchat best friends?", 'Which TikTok mutuals do you actually know?'], clears: 5, tag: 'Other', leave: true },
    { id: 'chats', name: 'Group Chats', line: "Scroll your group chats oldest to newest. Who's in each one? The timer waits while you look.", cues: ['The chat with the funny name.', 'The one that went quiet.'], chains: ["Who's in a dead chat you never left?", "Who's in your Discord servers or Instagram group DMs?"], clears: 5, tag: 'Group chat', leave: true },
    { id: 'shift', name: 'Same Shift', line: "Clock in. Slow part of the shift. Who's on with you?", cues: ['The schedule on the break room wall.', 'Who always swapped shifts with you.'], chains: ['Who trained you on day one?', 'Who was on with you at your last job?'], clears: 3, tag: 'Work' },
    { id: 'lunch', name: 'The Lunch Table', line: "Cafeteria, junior year. Find your table. Who's there? Now the next table.", cues: ['Who saved you a seat.', 'The table next to yours.'], chains: ['Who was in your homeroom?', 'Who did you ride to school with?'], clears: 3, tag: 'School' },
    { id: 'bus', name: 'Team Bus', line: "After an away game, speaker on. Who's in the seats around you?", cues: ['The back row.', 'Who controlled the music.'], chains: ['Who was on the team the year before you?', 'Who was on your club or travel team?'], clears: 3, tag: 'Sports' },
    { id: 'gym', name: 'The Gym', line: "The rack you always use. Who's there at the same time?", cues: ['Your usual time slot.', 'Who you spot, and who spots you.'], chains: ['Who do you play pickup, rec league or jiu-jitsu with?', 'Which trainers or front-desk people know your name?'], clears: 3, tag: 'Gym' },
    { id: 'street', name: 'Home Street', line: 'Stand in front of the house you grew up in. Look left, right, across.', cues: ['The house with the hoop.', 'Who walked to the bus stop with you.'], chains: ['Who did you bike with?', 'Who are your neighbors now?'], clears: 3, tag: 'Neighborhood' },
    { id: 'lost', name: 'Lost Touch', line: "Who were you tight with two years ago and haven't texted since? Picture where you two used to hang out.", cues: ['Old photos on your camera roll.', 'The friend group before this one.'], chains: ['Who did they hang out with?', 'Who would you text if you ran into them?'], clears: 3, tag: 'Lost touch' },
    { id: 'family', name: 'Family Table', line: 'Last big family gathering. Go around the table.', cues: ["The kids' table.", 'Who always shows up late.'], chains: ["Who are your parents' friends' kids?", "Who are your siblings' friends?"], clears: 3, tag: 'Family' },
    { id: 'clubs', name: 'Clubs, Church, Community', line: 'Youth group, band, robotics, scouts, volunteer shifts. Who was in the room?', cues: ['The sign-in sheet.', 'The trip you all went on.'], chains: ['Who ran it?', 'Who was in your carpool?'], clears: 3, tag: 'Hobbies/Clubs/Community' },
    { id: 'roommates', name: 'Roommates', line: 'Dorm, apartment, barracks, mission companion, anyone you lived with. Who was down the hall?', cues: ['The shared kitchen.', 'Move-in day.'], chains: ["Who was always over but didn't live there?", 'Who shared a lease or a Wi-Fi password with you?'], clears: 3, tag: 'Other', note: 'Skip it if this one isn’t you.' },
    { id: 'bignight', name: 'The Big Night', line: "Last party, wedding, concert, trip. Who did you go with? Who's in the photos?", cues: ['The group photo.', 'Who drove.'], chains: ['Who posted the photos?', 'Who did you leave with?'], clears: 3, tag: 'Other' },
    { id: 'plusone', name: 'Plus-One Chain', line: 'Pick someone already on your Wall. Who did they always bring?', cues: [], chains: ['Who introduced you to them?', 'Who else was always with them?'], clears: 3, tag: null, unlock: 20 },
    { id: 'mutual', name: 'Mutual Friends', line: 'Three people already on your Wall. Who were they always with?', cues: [], chains: ['Who do these three have in common?', 'Who was in the same photos as them?'], clears: 3, tag: null, unlock: 20 }
  ];
  R.scene = function (id) { for (var i = 0; i < R.SCENES.length; i++) if (R.SCENES[i].id === id) return R.SCENES[i]; return null; };
  R.PANTHER = 'img/panther-192.jpg';

  /* ------------------------------------------------------------ helpers --------------------------------- */
  R.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  R.plural = function (n, w, ws) { return n + ' ' + (n === 1 ? w : (ws || w + 's')); };
  R.money = function (cents) { var n = Number(cents || 0) / 100; return '$' + (n % 1 === 0 ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };
  function toDate(v) { if (!v) return null; if (v instanceof Date) return v; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); } var d = new Date(v); return isNaN(d) ? null : d; }
  R.date = function (v) { var d = toDate(v); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };
  R.dateLong = function (v) { var d = toDate(v); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  R.dateTime = function (v) { var d = toDate(v); return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  R.today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  R.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.floor(Math.random() * 256); });
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  R.normPhone = function (s) { var d = String(s || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d; };
  R.phoneOk = function (d) { return /^\d{10}$/.test(d || ''); };
  R.fmtPhone = function (d) { return R.phoneOk(d) ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : (d || ''); };
  R.normHandle = function (s) { return String(s || '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?[^\/]+\//, '').replace(/^@/, '').replace(/[\/?#].*$/, ''); };
  R.fullName = function (e) { var f = e.first_name != null ? e.first_name : e.first, l = e.last_name != null ? e.last_name : e.last; return ((f || '') + (l ? ' ' + l : '')).trim(); };
  R.missing = function (e) {
    var m = [];
    if (!e.last_name) m.push('Last name');
    if (!R.phoneOk(e.phone)) m.push('Phone');
    if (!e.handle || !e.platform || (e.platform === 'Other' && !e.other_app)) m.push('Social handle');
    return m;
  };
  R.level = function (xp) { var cur = R.LEVELS[0], nxt = R.LEVELS[1]; for (var i = 0; i < R.LEVELS.length; i++) { if (xp >= R.LEVELS[i][1]) { cur = R.LEVELS[i]; nxt = R.LEVELS[i + 1] || null; } } return { name: cur[0], min: cur[1], next_name: nxt ? nxt[0] : null, next_min: nxt ? nxt[1] : null }; };
  R.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ------------------------------------------------------------ wording ---------------------------------- */
  var SAY = {
    offline: 'No signal. Try again when you’re back online.', server: 'RALLY is having trouble right now. Try again in a minute.',
    expired: 'Your session ended. Sign in again.', signed_out: 'Sign in to continue.', not_signed_in: 'Sign in again.',
    no_team: 'Your account isn’t on a team yet. Ask your leader to add you.', disabled: 'This account is turned off. Talk to your leader.',
    not_installed: 'RALLY 100 isn’t switched on yet. The owner finishes setup in Supabase.',
    invalid_grant: 'Wrong email or password.', email_not_confirmed: 'Confirm your email first, then sign in.', user_already_exists: 'That email already has an account. Sign in instead.',
    weak_password: 'Use a password with at least 8 characters.',
    invalid_phone: 'Needs 10 digits (area code first).', platform_required: 'Pick the app so we know where to find them.',
    other_app_required: 'Name the app.', first_required: 'Add a first name.', name_too_long: 'That name is too long.',
    not_found: 'That record isn’t available.', entry_removed: 'That contact was removed. Restore it first.',
    handle_match_needs_fix: 'One handle can’t belong to two people. Fix the handle or merge them.', reason_required: 'Add a short reason.',
    entry_not_complete: 'Finish this contact to introduce them.', held_duplicate: 'Sort out the possible duplicate first.',
    do_not_contact: 'This person asked not to be contacted by RALLY.', locked_reward: 'This reward is already approved. Ask the owner.',
    count_below_100: 'The list is below 100. Approval opens at 100.', spot_check_required: 'Do the spot-check first.',
    no_credited_rep: 'No introduction is on record yet.', not_ready: 'This reward isn’t ready for review.',
    self_involved: 'You can’t approve a reward that’s yours.', owner_only: 'Only the owner can do that.',
    method_required: 'Add how it was paid.', already_paid: 'Pay was already issued for this reward.',
    both_have_rewards: 'Both people already have a referral reward. Ask the owner.', date_required: 'Pick a date.',
    start_date_required: 'Add the start date.', travel_required: 'Add the travel plan or mark it not needed.',
    note_required: 'Add a short note.', invalid_stage: 'That stage isn’t available.', not_allowed: 'You can’t do that here.',
    name_required: 'Add a name.', prize_required: 'Add the prize amount.', picture_required: 'Add at least one picture to publish.',
    too_many_pictures: 'Use up to 4 pictures.', picture_too_large: 'That picture is too large. Try a smaller one.',
    not_published: 'That incentive isn’t published.', invalid_status: 'That status isn’t available.',
    too_long: 'That’s too long. Shorten it a little.', invalid_platform: 'Pick one of the apps on the list.',
    not_held: 'That contact isn’t waiting on a duplicate check anymore.', stage_locked: 'Your leader is handling the next steps with this person now.',
    outcome_locked: 'Your leader already updated this person. Ask your leader.', intro_not_recorded: 'The rep hasn’t recorded this introduction yet.',
    spot_check_size: 'Mark every contact in the sample first.', spot_check_entry: 'That sample changed. Reload and try again.',
    reward_reversed: 'This reward was reversed.', match_closed: 'That possible match was already handled.',
    invalid_prize: 'Enter the prize in dollars, like 50 or 50.00.', invalid_picture: 'That picture couldn’t be used. Try another one.',
    not_approved: 'Approve this reward before marking pay issued.', not_candidate: 'Pick a rep who has this person on their list.',
    invalid_version: 'RALLY 100 was updated. Reload the app and try again.',
    rep_closed: 'The owner closed this rep’s unpaid rewards. Ask the owner.',
    list_full: 'Your list is full at 500 names. Remove a few you won’t use to add more.',
    no_sample: 'Open the rep’s list first so the spot-check sample is drawn.', intro_required: 'Plan or record your introduction first.',
    request_reused: 'That was already saved. Reload to see it.'
  };
  R.say = function (code) { return SAY[code] || 'Something went wrong. Try again.'; };

  /* ------------------------------------------------------------ icons ------------------------------------ */
  R.ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>',
    scenes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.6c2.3.2 4 1.8 4.6 4.6"/></svg>',
    intros: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h12"/><path d="M12 6l6 6-6 6"/><path d="M20 4v16"/></svg>',
    rewards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.5L7 21l5-2.6 5 2.6-1.6-7.5"/></svg>',
    queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    reps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M10.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/></svg>',
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    contacts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17.5c.9-2.2 2.5-3.2 4.5-3.2s3.6 1 4.5 3.2"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ------------------------------------------------------------ UI primitives --------------------------- */
  R.toast = function (msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    var t = document.createElement('div'); t.className = 'toast' + (kind ? ' ' + kind : ''); t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === 'bad' ? 3200 : 1900);
  };
  R.sheet = function (html) {
    R.closeSheet();
    var w = document.createElement('div'); w.className = 'sheet-wrap'; w.id = 'sheetWrap';
    w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    w.addEventListener('click', function (ev) { if (ev.target === w) R.closeSheet(); });
    document.body.appendChild(w);
    var f = w.querySelector('[autofocus],input,textarea,select'); if (f && f.hasAttribute('autofocus')) setTimeout(function () { try { f.focus(); } catch (e) {} }, 50);
    return w.querySelector('.sheet');
  };
  R.closeSheet = function () { var w = document.getElementById('sheetWrap'); if (w) w.remove(); };
  var celeQ = [], celeOn = false;
  R.celebrate = function (c) { celeQ.push(c); if (!celeOn) { celeOn = true; setTimeout(nextCele, 200); } };
  function nextCele() {
    var c = celeQ.shift(); if (!c) { celeOn = false; return; }
    var el = document.createElement('div'); el.className = 'overlay'; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="cele">' + (c.stamp ? '<img src="' + R.PANTHER + '" alt="">' : '') + (c.check ? '<div class="bigcheck">' + R.ICON.check + '</div>' : '') +
      '<div class="ct">' + R.esc(c.title) + '</div>' + (c.sub ? '<p class="muted">' + R.esc(c.sub) + '</p>' : '') + '<div class="tap">Tap to continue</div></div>';
    var gone = false; function done() { if (gone) return; gone = true; el.remove(); nextCele(); }
    el.addEventListener('click', done); document.body.appendChild(el); setTimeout(done, c.ms || 1450);
  }
  R.busy = function (btn, on) { if (!btn) return; if (on) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; } else { btn.removeAttribute('aria-busy'); btn.disabled = false; } };
  R.haptic = function () { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} };
  R.copy = function (text) {
    try { navigator.clipboard.writeText(text).then(function () { R.toast('Copied', 'win'); }, function () { fallback(); }); } catch (e) { fallback(); }
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); R.toast('Copied', 'win'); } catch (x) { R.toast('Copy failed. Select the text instead.', 'bad'); } ta.remove(); }
  };
  R.download = function (filename, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ------------------------------------------------------------ router ----------------------------------- */
  R.screens = {}; R.actions = {}; R.forms = {};
  R.data = { me: null, rep: null, team: null, owner: null };
  R.view = { name: null, p: {} };
  R.mode = 'rep';
  var NAVS = {
    rep: [['home', 'Home', 'home'], ['scenes', 'Scenes', 'scenes'], ['network', 'Network', 'network'], ['intros', 'Intros', 'intros'], ['rewards', 'Rewards', 'rewards']],
    lead: [['lead-queue', 'Queue', 'queue'], ['lead-reps', 'Reps', 'reps']],
    owner: [['own-dash', 'Dashboard', 'dash'], ['own-contacts', 'Contacts', 'contacts'], ['own-rewards', 'Rewards', 'rewards'], ['own-incentives', 'Incentives', 'gift'], ['lead-queue', 'Queue', 'queue'], ['lead-reps', 'Reps', 'reps']]
  };
  R.navBadges = {};
  R.role = function () { return (R.data.me && R.data.me.user && R.data.me.user.role) || 'rep'; };
  R.isLeader = function () { var r = R.role(); return r === 'leader' || r === 'manager' || r === 'owner'; };
  R.isOwner = function () { return R.role() === 'owner'; };
  function topbar(scr) {
    var right = '';
    if (!navigator.onLine) right += '<span class="offline">Offline</span>';
    var pend = R.outbox ? R.outbox.count() : 0;
    if (pend) right += '<span class="offline">' + pend + ' to sync</span>';
    if (R.isLeader()) {
      var inRep = scr.mode === 'rep';
      right += '<button class="pill" data-a="mode-switch">' + (inRep ? (R.isOwner() ? 'Owner view' : 'Team view') : 'My list') + '</button>';
    }
    right += '<button class="pill" data-a="account" aria-label="Account and settings" style="padding:0 10px">' + R.ICON.user.replace('<svg', '<svg width="18" height="18" style="vertical-align:middle"') + '</button>';
    return '<header class="top"><div class="top-in"><div class="brand"><img class="mark" src="' + R.PANTHER + '" alt="RALLY MKTG panther" width="28" height="28"><span class="wm">RALLY 100</span></div><div class="row" style="flex:none;gap:8px;align-items:center">' + right + '</div></div></header>';
  }
  function nav(kind, active) {
    var items = NAVS[kind]; if (!items) return '';
    return '<nav class="nav" aria-label="Main"><div class="nav-in">' + items.map(function (it) {
      var on = it[0] === active || (R.screens[active] && R.screens[active].tab === it[0]);
      var badge = R.navBadges[it[0]] ? '<span class="badge">' + R.navBadges[it[0]] + '</span>' : '';
      return '<button data-a="tab" data-k="' + it[0] + '" class="' + (on ? 'on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' + R.ICON[it[2]] + '<span>' + it[1] + '</span>' + badge + '</button>';
    }).join('') + '</div></nav>';
  }
  R.go = function (name, p) {
    if (R.onLeave) { try { R.onLeave(); } catch (e) {} R.onLeave = null; }
    R.view = { name: name, p: p || {} };
    var scr = R.screens[name];
    if (scr && scr.mode) R.mode = scr.mode;
    R.render();
    try { window.scrollTo(0, 0); } catch (e) {}
  };
  R.render = function () {
    var scr = R.screens[R.view.name]; var app = document.getElementById('app');
    if (!scr) { app.innerHTML = '<main class="screen"><p>Screen not found.</p></main>'; return; }
    document.documentElement.classList.toggle('rm', !!R.store.get('r100_rm', false));
    document.body.classList.toggle('wide', !!scr.wide);
    var html = '';
    try { html = scr.render(R.view.p || {}); } catch (e) { console.error(e); html = '<main class="screen"><div class="card"><h2>Something went wrong.</h2><p class="muted">Reload the app. If it keeps happening, tell your leader.</p></div></main>'; }
    app.innerHTML = (scr.bare ? '' : topbar(scr)) + html + (scr.nav ? nav(scr.nav, R.view.name) : '');
    if (scr.after) { try { scr.after(R.view.p || {}); } catch (e) { console.error(e); } }
  };
  /* Redraw just the top bar (offline and "N to sync" pills) without touching the screen under it. */
  R.renderTop = function () {
    var scr = R.screens[R.view.name], old = document.querySelector('#app > header.top');
    if (!scr || scr.bare || !old) return;
    var t = document.createElement('div'); t.innerHTML = topbar(scr); old.replaceWith(t.firstChild);
  };
  R.homeFor = function () { var r = R.role(); return r === 'owner' ? 'own-dash' : (r === 'leader' || r === 'manager') ? 'lead-queue' : 'home'; };

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a]'); if (!b) return;
    var f = R.actions[b.dataset.a]; if (!f) return;
    ev.preventDefault(); f(b, ev);
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('form[data-form]'); if (!f) return;
    var h = R.forms[f.dataset.form]; if (!h) return;
    ev.preventDefault(); h(f, ev);
  });

  /* ------------------------------------------------------------ data ------------------------------------- */
  var LOADERS = { rep: 'rep_state', team: 'team_state', owner: 'owner_state' };
  R.load = async function (kind) {
    var d = await R.cloud.rpc(LOADERS[kind], {});
    R.data[kind] = d; R.data[kind + 'At'] = Date.now();
    return d;
  };
  R.handleError = function (e) {
    if (e && e.kind === 'auth') { R.toast(R.say('expired'), 'bad'); R.go('signin'); return; }
    R.toast(R.say(e && e.code), 'bad');
  };
  R.call = async function (name, params, btn) {
    R.busy(btn, true);
    try { return await R.cloud.rpc(name, params || {}); }
    catch (e) { R.handleError(e); return null; }
    finally { R.busy(btn, false); }
  };

  /* ------------------------------------------------------------ outbox ----------------------------------- */
  /* Rep list writes (save_entry) are kept on the phone until the server takes them, so a name typed in a
     dead zone is never lost. Items replay in order; a newer save of the same entry folds into the older
     one. Network failures wait and retry; a server "no" drops the item and tells the rep why. */
  R.outbox = (function () {
    var items = [], busy = false, timer = null, key = null, listeners = [], inflight = null;
    function persist() { if (key) R.store.set(key, items); R.renderTop(); }
    return {
      bind: function (uid) { key = 'r100_outbox_' + uid; items = R.store.get(key, []) || []; },
      /* Sign-out: names still queued leave this phone with the account (the rep was warned first). */
      forget: function () { if (key) { try { localStorage.removeItem(key); } catch (e) {} } items = []; key = null; },
      items: function () { return items.map(function (it) { return { p: Object.assign({}, it.p), at: it.at }; }); },
      count: function () { return items.length; },
      pending: function (id) { for (var i = 0; i < items.length; i++) if (items[i].p.id === id) return true; return false; },
      onDone: function (fn) { listeners.push(fn); },
      add: function (p) {
        /* Fold into a queued save of the same entry, but never into the one already on its way: that one
           leaves the queue when it lands, and a newer edit folded into it would leave with it. */
        for (var i = 0; i < items.length; i++) {
          if (items[i] !== inflight && items[i].p.id === p.id) { Object.assign(items[i].p, p); persist(); this.flush(); return; }
        }
        items.push({ p: Object.assign({}, p), at: Date.now() }); persist(); this.flush();
      },
      flush: async function () {
        if (busy || !items.length) return; busy = true;
        try {
          while (items.length) {
            var it = items[0], res;
            inflight = it;
            try { res = await R.cloud.rpc('save_entry', { p: it.p }); }
            catch (e) {
              inflight = null;
              if (e.kind === 'net') { clearTimeout(timer); timer = setTimeout(function () { R.outbox.flush(); }, 15000); break; }
              /* An expired session is not a "no" about the name: keep it queued for after the rep signs in again. */
              if (e.kind === 'auth') { R.handleError(e); break; }
              items.shift(); persist();
              R.toast(R.say(e.code), 'bad');
              listeners.forEach(function (fn) { try { fn(null, it.p, e); } catch (x) {} });
              continue;
            }
            inflight = null;
            items.shift(); persist();
            listeners.forEach(function (fn) { try { fn(res, it.p, null); } catch (x) { console.error(x); } });
          }
        } finally { busy = false; }
      }
    };
  })();
  window.addEventListener('online', function () { R.outbox.flush(); R.renderTop(); });
  window.addEventListener('offline', function () { R.renderTop(); });

  /* ------------------------------------------------------------ shared actions -------------------------- */
  R.actions.tab = function (b) { R.go(b.dataset.k); };
  R.actions['sheet-close'] = function () { R.closeSheet(); };
  R.actions['mode-switch'] = function () {
    var scr = R.screens[R.view.name] || {};
    if (scr.mode === 'rep') R.go(R.isOwner() ? 'own-dash' : 'lead-queue');
    else R.go(R.data.me && R.data.me.ack_accepted ? 'home' : 'onboarding');
  };
  R.actions.account = function () {
    var u = (R.data.me && R.data.me.user) || {};
    var rm = !!R.store.get('r100_rm', false);
    R.sheet('<h2>' + R.esc(u.name || u.email || 'Account') + '</h2><p class="muted small">' + R.esc(u.email || '') + '</p>' +
      '<p class="small">' + R.esc({ rep: 'Rep', leader: 'Leader', manager: 'Leader', owner: 'Owner' }[u.role] || 'Rep') + (u.team_name ? ' · ' + R.esc(u.team_name) : '') + '</p>' +
      '<button class="btn" data-a="toggle-rm">Reduce motion: ' + (rm ? 'On' : 'Off (follows your phone)') + '</button>' +
      '<p class="small dim">Every contact you save is shared with the RALLY recruiting team. Other reps never see your list.</p>' +
      '<button class="btn danger" data-a="sign-out">Sign out</button><button class="btn ghost" data-a="sheet-close">Close</button>' +
      '<p class="small dim">RALLY 100 v' + R.version + '</p>');
  };
  R.actions['toggle-rm'] = function () { R.store.set('r100_rm', !R.store.get('r100_rm', false)); R.render(); R.actions.account(); };
  R.actions['sign-out'] = async function () {
    if (R.outbox.count()) {
      R.sheet('<h2>Unsynced names</h2><p class="muted">' + R.plural(R.outbox.count(), 'change') + ' haven’t reached RALLY yet. Signing out now would lose them. Get signal first, then sign out.</p><div class="row"><button class="btn" data-a="sheet-close">Stay signed in</button><button class="btn danger" data-a="sign-out-force">Sign out anyway</button></div>');
      return;
    }
    R.actions['sign-out-force']();
  };
  R.actions['sign-out-force'] = async function () {
    R.closeSheet();
    var s = R.cloud.session();
    if (s && s.userId) { try { localStorage.removeItem('r100_me_' + s.userId); } catch (e) {} }
    R.outbox.forget();
    await R.cloud.signOut();
    R.data = { me: null, rep: null, team: null, owner: null };
    R.go('signin');
  };
})();
