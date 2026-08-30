/* RALLY — the device gate, now with an optional cloud account behind it.
   RALLY is local-first: a season of knocks lives in this phone's
   IndexedDB. "Sign in" is therefore two things at once:
   - always: a LOCK ON THIS DEVICE — it keeps a lost or borrowed phone
     from spilling customer names, addresses and signed agreements.
   - when cloud is configured (js/cloud-config.js): a real account,
     verified by the server first whenever the network allows.

   The contract between the two:
   - Online, the server decides. A successful cloud sign-in refreshes
     this device's local verifier from the very password just proven,
     so the phone can keep unlocking offline afterward.
   - Offline, the device verifier decides — but ONLY on a device that
     has signed in before. A brand-new device offline has nothing to
     verify against and stays locked until it can reach the server once.
   - The passcode itself is never stored, locally or otherwise. We keep
     a random salt and a PBKDF2-SHA256 derivation (210k iterations),
     compared in constant time. Cloud sessions are bearer tokens in
     IndexedDB; both are excluded from backups.
   - It gates the app, not the disk. A determined person with the
     unlocked phone and developer tools could still read the database.
     It is a door lock, not a safe. */
(function () {
  const KEY_ACCOUNT = "account";
  const KEY_SESSION = "session";
  const ITERATIONS = 210000;
  const MIN_PASS = 6;
  const FREE_TRIES = 5;      // before the backoff starts
  const BASE_LOCK_MS = 30e3; // doubles per failure after that, capped

  const enc = new TextEncoder();

  const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function derive(password, saltBytes, iterations) {
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, key, 256);
    return b64(bits);
  }

  // length-independent, early-exit-free comparison
  function sameSecret(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  const normEmail = (e) => String(e || "").trim().toLowerCase();

  let account = null;   // { email, name, salt, hash, iterations, userId, createdAt,
                        //   fails, lockedUntil }
  let unlocked = false;

  async function load() {
    account = await MDB.kvGet(KEY_ACCOUNT, null);
    // Sign in ONCE and the device stays signed in: a stored session rides
    // across launches until the rep explicitly signs out (More → Sign out).
    // A rep at doors all day can't be typing a passcode every time the
    // phone comes out of a pocket.
    const session = account ? await MDB.kvGet(KEY_SESSION, null) : null;
    unlocked = !!(session && session.userId === account.userId);
    // Standing-check in the background whenever we're online: a disabled
    // or revoked cloud account gets walked back to the gate. Network
    // trouble never locks anyone out — that's the whole point of the
    // device verifier.
    if (unlocked && window.MCLOUD && MCLOUD.enabled()) {
      MCLOUD.revalidate().then((v) => {
        if (v === "disabled" || v === "revoked") {
          signOut().then(() => location.reload());
        }
      }).catch(() => {});
    }
    return account;
  }

  // Drop back to locked without touching anything stored (used when the app
  // comes back from the background).
  function lockSession() { unlocked = false; }

  const hasAccount = () => !!account;
  // strictly "this session is authenticated". A device with no account is
  // NOT unlocked — it needs to create one, which is the sign-up screen.
  const isUnlocked = () => unlocked;
  // the address this device is signed in as — always known once claimed
  const accountEmail = () => (account ? account.email : "");
  // …but only offered back into the form if the rep asked us to remember it
  const emailOnFile = () => (account && account.rememberEmail ? account.email : "");

  function lockRemainingMs() {
    if (!account || !account.lockedUntil) return 0;
    return Math.max(0, account.lockedUntil - Date.now());
  }

  async function persistAccount() {
    await MDB.kvSet(KEY_ACCOUNT, account);
  }

  /* Create the device account. On an install that already has data (an
     upgrade), this adopts the existing device user instead of making a
     duplicate — the knocks, customers and hoods stay exactly as they are. */
  async function signUp({ email, name, password }) {
    // A claimed device is NEVER re-keyed without proving the old passcode.
    // Without this, "Sign up" on a locked phone would mint fresh credentials
    // over the owner's and open their whole book — the gate's entire point.
    // Re-keying goes through eraseAndReset, which is honest about the cost.
    if (account) {
      throw new Error("This device already has an account — sign in, or use Forgot passcode");
    }
    email = normEmail(email);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Enter a valid email address");
    }
    if (!password || password.length < MIN_PASS) {
      throw new Error(`Passcode needs at least ${MIN_PASS} characters`);
    }

    // With cloud configured, the account is REAL — created on the server
    // first, and only then mirrored into this device's lock. No connection
    // means no new accounts: a stranger's phone in a dead zone must not be
    // able to mint credentials in front of a locked book.
    let cloud = null;
    if (window.MCLOUD && MCLOUD.enabled()) {
      let res;
      try {
        res = await MCLOUD.signUp(email, password, String(name || "").trim());
      } catch (e) {
        throw new Error(e.cloud === "net"
          ? "Creating an account needs a connection — try again when you're online"
          : (e.message || "Couldn't create the account"));
      }
      // confirmation email flow: nothing local yet — the rep confirms,
      // then signs in, and THAT binds this device
      if (res && res.pendingConfirm) return { pendingConfirm: true };
      cloud = res;
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, ITERATIONS);

    let user = STORE.currentUser();
    const displayName = String(name || "").trim();
    if (user) {
      if (displayName && user.name !== displayName) {
        user.name = displayName;
        await STORE.updateUser(user);
        STORE.settings.repName = displayName;
        await STORE.saveSettings();
      }
    } else {
      user = await STORE.addUser({ name: displayName || "Me", role: "manager" });
      STORE.settings.currentUserId = user.id;
      STORE.settings.repName = user.name;
      await STORE.saveSettings();
    }

    account = {
      email, name: displayName || user.name,
      salt: b64(salt), hash, iterations: ITERATIONS,
      userId: user.id, createdAt: Date.now(),
      fails: 0, lockedUntil: 0,
      rememberEmail: true, // they just typed it; offer it back next time
    };
    if (cloud && cloud.userId) {
      account.cloudUserId = cloud.userId;
      // profile is enrichment, not a gate — a blip here never blocks signup
      try { await MCLOUD.fetchProfile(cloud.access, cloud.userId); } catch (_) {}
    }
    await persistAccount();
    await MDB.kvSet(KEY_SESSION, { userId: user.id, at: Date.now() });
    unlocked = true;
    return account;
  }

  async function bumpFails() {
    if (!account) return;
    account.fails = (account.fails || 0) + 1;
    if (account.fails > FREE_TRIES) {
      const over = account.fails - FREE_TRIES;
      account.lockedUntil = Date.now() +
        Math.min(BASE_LOCK_MS * Math.pow(2, over - 1), 15 * 60e3);
    }
    await persistAccount();
  }

  // The original device-verifier path, behavior intact: PBKDF2 compare,
  // shared backoff, session write. This is all of sign-in when cloud is
  // off, and the offline path when it's on.
  async function signInLocal(email, password, remember) {
    const attempt = await derive(password || "", unb64(account.salt), account.iterations);
    const emailOk = normEmail(email) === account.email;
    // one generic failure for both wrong-email and wrong-passcode: never
    // confirm which half was right
    if (!emailOk || !sameSecret(attempt, account.hash)) {
      await bumpFails();
      throw new Error("That email and passcode don't match");
    }
    account.fails = 0;
    account.lockedUntil = 0;
    account.rememberEmail = !!remember;
    await persistAccount();
    await MDB.kvSet(KEY_SESSION, { userId: account.userId, at: Date.now() });
    unlocked = true;
    return account;
  }

  // A cloud-verified password becomes this device's fresh verifier — that
  // is exactly what keeps the phone unlockable in a dead zone tomorrow.
  async function bindCloudAccount(email, password, cloud, prof, remember) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password || "", salt, ITERATIONS);
    if (!account) {
      let user = STORE.currentUser();
      if (!user) {
        user = await STORE.addUser({ name: (prof && prof.name) || "Me", role: "manager" });
        STORE.settings.currentUserId = user.id;
        STORE.settings.repName = user.name;
        await STORE.saveSettings();
      }
      account = {
        email: normEmail(email), name: (prof && prof.name) || user.name,
        salt: b64(salt), hash, iterations: ITERATIONS,
        userId: user.id, createdAt: Date.now(),
        fails: 0, lockedUntil: 0, rememberEmail: !!remember,
      };
    } else {
      account.salt = b64(salt);
      account.hash = hash;
      account.iterations = ITERATIONS;
      account.fails = 0;
      account.lockedUntil = 0;
      account.rememberEmail = !!remember;
    }
    account.cloudUserId = (cloud && cloud.userId) || account.cloudUserId || null;
    await persistAccount();
    await MDB.kvSet(KEY_SESSION, { userId: account.userId, at: Date.now() });
    unlocked = true;
    return account;
  }

  async function signIn(email, password, remember) {
    const cloudOn = !!(window.MCLOUD && MCLOUD.enabled());
    if (!account && !cloudOn) {
      throw new Error("No account on this device yet — tap Sign up to create one");
    }
    // the device throttle stands in front of BOTH paths — it guards the
    // local verifier and meters cloud attempts alike
    const waitMs = lockRemainingMs();
    if (waitMs > 0) {
      const s = Math.ceil(waitMs / 1000);
      throw new Error(s > 60
        ? `Too many tries — wait ${Math.ceil(s / 60)} min`
        : `Too many tries — wait ${s}s`);
    }
    // A claimed device only ever signs in its own account: a teammate's
    // perfectly valid cloud login must not open THIS phone's book. The
    // local path fails it generically, same as always.
    if (!cloudOn || (account && normEmail(email) !== account.email)) {
      return signInLocal(email, password, remember);
    }

    let cloud;
    try {
      cloud = await MCLOUD.signIn(normEmail(email), password || "");
    } catch (e) {
      if (e.cloud === "net") {
        // offline: the device verifier decides — but only on a device
        // that has successfully signed in before
        if (account) return signInLocal(email, password, remember);
        throw new Error("You're offline and this device isn't set up yet — connect once to sign in");
      }
      // The server said no. A local account that predates the cloud
      // (no cloudUserId yet) keeps working on its device verifier until
      // a server account exists for it — flipping cloud on must never
      // strand the phones already in the field.
      if (account && !account.cloudUserId) {
        try { return await signInLocal(email, password, remember); } catch (_) {}
      } else {
        await bumpFails();
      }
      throw new Error("That email and passcode don't match");
    }

    // authenticated — now check the account's standing before unlocking
    let prof = null;
    try { prof = await MCLOUD.fetchProfile(cloud.access, cloud.userId); } catch (_) {}
    if (prof && prof.disabled) {
      await MCLOUD.signOut();
      throw new Error("This RALLY account has been disabled — talk to your team leader");
    }
    return bindCloudAccount(email, password, cloud, prof, remember);
  }

  async function signOut() {
    unlocked = false;
    await MDB.kvSet(KEY_SESSION, null);
    // the cloud session goes with it; the device verifier stays, so the
    // same rep can still sign back in offline later
    if (window.MCLOUD) {
      try { await MCLOUD.signOut(); } catch (_) {}
    }
  }

  /* No server means no emailed reset. The only honest recovery is to
     clear this device and restore from a backup file. */
  async function eraseAndReset() {
    // the cloud session (tokens + cached profile) is wiped with the rest
    if (window.MCLOUD) {
      try { await MCLOUD.signOut(); } catch (_) {}
    }
    await Promise.all([
      MDB.clear("pins"), MDB.clear("events"), MDB.clear("customers"),
      MDB.clear("territories"), MDB.clear("files"), MDB.clear("users"),
    ]);
    await MDB.kvSet(KEY_ACCOUNT, null);
    await MDB.kvSet(KEY_SESSION, null);
    await MDB.kvSet("settings", null);
    account = null;
    unlocked = false;
  }

  window.MAUTH = {
    load, signUp, signIn, signOut, eraseAndReset, lockSession,
    hasAccount, isUnlocked, emailOnFile, accountEmail, lockRemainingMs,
    MIN_PASS,
  };
})();
