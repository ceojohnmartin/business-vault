/* RALLY 100: boot, sign in, account creation, password reset, and routing by role. */
(function () {
  var R = window.R100;

  function authShell(inner) {
    return '<main class="ob"><div class="hero"><img src="' + R.PANTHER + '" alt="RALLY MKTG panther"><span class="wm">RALLY 100</span></div>' + inner + '</main>';
  }

  R.screens.boot = { bare: true, render: function () { return '<div class="center"><div class="spinner" aria-label="Loading"></div></div>'; } };

  R.screens.signin = {
    bare: true,
    render: function (p) {
      return authShell('<h1>Sign in</h1><p class="muted">Use the same email and password as the RALLY app.</p>' +
        '<form data-form="signin" class="stack" autocomplete="on">' +
        '<div class="field"><label for="siEmail">Email</label><input id="siEmail" type="email" autocomplete="username" inputmode="email" required value="' + R.esc(p.email || '') + '"></div>' +
        '<div class="field"><label for="siPass">Password</label><input id="siPass" type="password" autocomplete="current-password" required></div>' +
        '<p class="err" id="siErr" aria-live="polite">' + R.esc(p.msg || '') + '</p>' +
        '<button class="btn primary" type="submit" id="siBtn">Sign in</button></form>' +
        '<div class="row"><button class="btn ghost" data-a="go-signup">Create account</button><button class="btn ghost" data-a="go-forgot">Forgot password</button></div>' +
        (R.cloud.dev() ? '<p class="small dim">Local development server. Dev users are in app/dev/users.json.</p>' : ''));
    },
    after: function (p) { var e = document.getElementById(p.email ? 'siPass' : 'siEmail'); if (e) try { e.focus(); } catch (x) {} }
  };
  R.forms.signin = async function (f) {
    var email = f.querySelector('#siEmail').value.trim(), pass = f.querySelector('#siPass').value, btn = f.querySelector('#siBtn'), err = f.querySelector('#siErr');
    err.textContent = ''; R.busy(btn, true);
    try { await R.cloud.signIn(email, pass); await boot(); }
    catch (e) { err.textContent = R.say(e.code); }
    finally { R.busy(btn, false); }
  };

  R.screens.signup = {
    bare: true,
    render: function () {
      return authShell('<h1>Create your account</h1><p class="muted">After you create it, your leader adds you to the RALLY team. Then you can start your 100 list.</p>' +
        '<form data-form="signup" class="stack" autocomplete="on">' +
        '<div class="field"><label for="suName">Your name</label><input id="suName" autocomplete="name" required maxlength="80"></div>' +
        '<div class="field"><label for="suEmail">Email</label><input id="suEmail" type="email" autocomplete="username" inputmode="email" required></div>' +
        '<div class="field"><label for="suPass">Password (at least 8 characters)</label><input id="suPass" type="password" autocomplete="new-password" minlength="8" required></div>' +
        '<p class="err" id="suErr" aria-live="polite"></p><button class="btn primary" type="submit" id="suBtn">Create account</button></form>' +
        '<button class="btn ghost" data-a="go-signin">I already have an account</button>');
    }
  };
  R.forms.signup = async function (f) {
    var name = f.querySelector('#suName').value.trim(), email = f.querySelector('#suEmail').value.trim(), pass = f.querySelector('#suPass').value;
    var btn = f.querySelector('#suBtn'), err = f.querySelector('#suErr'); err.textContent = '';
    if (pass.length < 8) { err.textContent = R.say('weak_password'); return; }
    R.busy(btn, true);
    try {
      var r = await R.cloud.signUp(email, pass, name);
      if (r.confirm) { R.go('notice', { title: 'Check your email', body: 'We sent a confirmation link to ' + email + '. Open it, then come back and sign in.', email: email }); }
      else await boot();
    } catch (e) { err.textContent = R.say(e.code); }
    finally { R.busy(btn, false); }
  };

  R.screens.forgot = {
    bare: true,
    render: function () {
      return authShell('<h1>Reset your password</h1><form data-form="forgot" class="stack"><div class="field"><label for="fgEmail">Email</label><input id="fgEmail" type="email" inputmode="email" required></div>' +
        '<p class="err" id="fgErr"></p><button class="btn primary" type="submit" id="fgBtn">Send reset link</button></form><button class="btn ghost" data-a="go-signin">Back to sign in</button>');
    }
  };
  R.forms.forgot = async function (f) {
    var email = f.querySelector('#fgEmail').value.trim(), btn = f.querySelector('#fgBtn');
    R.busy(btn, true);
    try { await R.cloud.recover(email); } catch (e) { if (e.kind === 'net') { f.querySelector('#fgErr').textContent = R.say(e.code); R.busy(btn, false); return; } }
    R.busy(btn, false);
    R.go('notice', { title: 'Check your email', body: 'If ' + email + ' has an account, a reset link is on its way.', email: email });
  };

  R.screens.notice = {
    bare: true,
    render: function (p) { return authShell('<h1>' + R.esc(p.title) + '</h1><p class="lines"><span>' + R.esc(p.body) + '</span></p><button class="btn primary" data-a="go-signin">Back to sign in</button>'); }
  };

  R.screens.noteam = {
    bare: true,
    render: function () {
      var u = (R.data.me && R.data.me.user) || {};
      return authShell('<h1>Almost there</h1><p class="lines"><span>You’re signed in as <b>' + R.esc(u.email || '') + '</b>. Your leader needs to add you to the RALLY team before you can start your 100 list.</span></p>' +
        '<p class="muted">Show your leader this email address. Once they add you, tap Check again.</p>' +
        '<button class="btn primary" data-a="recheck">Check again</button><button class="btn ghost" data-a="sign-out-force">Sign out</button>');
    }
  };
  R.screens.setup = {
    bare: true,
    render: function (p) {
      return authShell('<h1>Not switched on yet</h1><p class="lines"><span>' + R.esc(p.msg || R.say('not_installed')) + '</span></p>' +
        '<p class="muted small">Owner: follow the setup steps in rally-100/app/SETUP.md, then reload.</p>' +
        '<button class="btn primary" data-a="recheck">Try again</button><button class="btn ghost" data-a="sign-out-force">Sign out</button>');
    }
  };
  R.screens.neterr = {
    bare: true,
    render: function () { return authShell('<h1>No connection</h1><p class="lines"><span>RALLY 100 needs signal to load the first time. Names you add later are kept on your phone until you’re back online.</span></p><button class="btn primary" data-a="recheck">Try again</button>'); }
  };

  R.screens.newpass = {
    bare: true,
    render: function () {
      return authShell('<h1>Set a new password</h1><form data-form="newpass" class="stack"><div class="field"><label for="npPass">New password (at least 8 characters)</label><input id="npPass" type="password" autocomplete="new-password" minlength="8" required autofocus></div>' +
        '<p class="err" id="npErr"></p><button class="btn primary" type="submit" id="npBtn">Save password</button></form>');
    }
  };
  R.forms.newpass = async function (f) {
    var pass = f.querySelector('#npPass').value, btn = f.querySelector('#npBtn'), err = f.querySelector('#npErr'); err.textContent = '';
    if (pass.length < 8) { err.textContent = R.say('weak_password'); return; }
    R.busy(btn, true);
    try { await R.cloud.updatePassword(pass); R.toast('Password saved', 'win'); await boot(); }
    catch (e) { err.textContent = R.say(e.code); }
    finally { R.busy(btn, false); }
  };

  R.actions['go-signup'] = function () { R.go('signup'); };
  R.actions['go-forgot'] = function () { R.go('forgot'); };
  R.actions['go-signin'] = function () { R.go('signin', {}); };
  R.actions.recheck = function () { joinTried = false; boot(); };

  var linkChecked = false, joinTried = false;
  async function boot() {
    if (!R.cloud.enabled()) { R.go('setup', {}); return; }
    if (!linkChecked) {
      linkChecked = true;
      var link = R.cloud.fromLink();
      if (link && link.error) { R.go('signin', { msg: 'That link has expired. Sign in, or ask for a new reset link.' }); return; }
      if (link && link.type === 'recovery') { R.go('newpass'); return; }
    }
    var s = R.cloud.session();
    if (!s) { R.go('signin', {}); return; }
    R.go('boot');
    var me;
    try { me = await R.cloud.rpc('whoami', {}); }
    catch (e) {
      if (e.kind === 'auth') { R.go('signin', { msg: R.say('expired') }); return; }
      if (e.code === 'not_installed') { R.go('setup', {}); return; }
      if (e.kind === 'net') {
        var cached = R.store.get('r100_me_' + s.userId, null);
        if (cached) { R.data.me = cached; R.outbox.bind(s.userId); route(); return; }
        R.go('neterr'); return;
      }
      if (e.code === 'disabled') { R.go('setup', { msg: R.say('disabled') }); return; }
      R.go('signin', { msg: R.say(e.code) }); return;
    }
    /* Auto-add (owner's switch): a confirmed rep with no team joins the owner's team here, then loads as usual. */
    if (me.no_team && me.auto_join && !joinTried) {
      joinTried = true;
      try { await R.cloud.rpc('join_team', {}); return boot(); }
      catch (e) { if (e.kind === 'auth') { R.go('signin', { msg: R.say('expired') }); return; } }
    }
    R.data.me = me;
    if (me.no_team) { R.go('noteam'); return; }
    R.store.set('r100_me_' + s.userId, me);
    R.outbox.bind(s.userId);
    R.outbox.flush();
    route();
  }
  function route() {
    var me = R.data.me, role = me.user.role;
    if (role === 'owner') { R.go('own-dash'); return; }
    if (role === 'leader' || role === 'manager') { R.go('lead-queue'); return; }
    R.go(me.ack_accepted ? 'home' : 'onboarding', { step: 0 });
  }
  R.boot = boot;

  if ('serviceWorker' in navigator && !R.cloud.dev()) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  boot();
})();
