/* RALLY — the device gate.
   RALLY is local-first: a season of knocks lives in this phone's
   IndexedDB, not on a server. So "sign in" here is a LOCK ON THIS
   DEVICE, not a network account — it keeps a lost or borrowed phone
   from spilling customer names, addresses and signed agreements to
   whoever picks it up.

   What that means honestly:
   - The passcode is never stored. We keep a random salt and a
     PBKDF2-SHA256 derivation (210k iterations), and compare in
     constant time.
   - There is no server, so there is no "email me a reset link".
     Forgetting the passcode means restoring from a backup file
     (More → Backup & restore) — which is exactly why that exists.
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
    await persistAccount();
    await MDB.kvSet(KEY_SESSION, { userId: user.id, at: Date.now() });
    unlocked = true;
    return account;
  }

  async function signIn(email, password, remember) {
    if (!account) throw new Error("No account on this device yet — tap Sign up to create one");
    const waitMs = lockRemainingMs();
    if (waitMs > 0) {
      const s = Math.ceil(waitMs / 1000);
      throw new Error(s > 60
        ? `Too many tries — wait ${Math.ceil(s / 60)} min`
        : `Too many tries — wait ${s}s`);
    }
    const attempt = await derive(password || "", unb64(account.salt), account.iterations);
    const emailOk = normEmail(email) === account.email;
    // one generic failure for both wrong-email and wrong-passcode: never
    // confirm which half was right
    if (!emailOk || !sameSecret(attempt, account.hash)) {
      account.fails = (account.fails || 0) + 1;
      if (account.fails > FREE_TRIES) {
        const over = account.fails - FREE_TRIES;
        account.lockedUntil = Date.now() +
          Math.min(BASE_LOCK_MS * Math.pow(2, over - 1), 15 * 60e3);
      }
      await persistAccount();
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

  async function signOut() {
    unlocked = false;
    await MDB.kvSet(KEY_SESSION, null);
  }

  /* No server means no emailed reset. The only honest recovery is to
     clear this device and restore from a backup file. */
  async function eraseAndReset() {
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
