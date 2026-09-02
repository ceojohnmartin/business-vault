# RALLY v39 — real-iPhone certification

**Nobody has run this yet.** Everything else about v39 is proved by automated
tests; this is the part no test can reach, because iOS decides when a
suspended web app reloads and no headless Chromium can tell you what Safari
will do. Until these results come back, v39 is not certified.

Budget 30–40 minutes. One iPhone. Nothing here is destructive to anything but
deliberately-created test data.

---

## 0. Which origin to test on — and why

**Test on the production origin: `https://ceojohnmartin.github.io/business-vault/rally/`.**

That is a deliberate choice, not a shortcut, and here is the reason.

RALLY is served from GitHub Pages, where **every project site shares one
origin**: `https://ceojohnmartin.github.io`. A "staging copy" published from a
second repo on the same account would live at a different *path* on the *same
origin*. Service workers and Cache Storage are scoped by path, so those would
be separate — but **IndexedDB and localStorage are scoped by ORIGIN, not by
path**. Staging and production would share the same `meridian-db`. Testing an
upgrade, a restore or a purge in "staging" would be reaching into production's
data on that phone, and the two builds would interleave writes in one store.
That is strictly more dangerous than testing production directly.

**The only genuinely isolated staging is a different origin**, which means one
of:

- a second GitHub account or organisation publishing the same commit
  (`otherorg.github.io/...`), or
- a custom domain pointed at a separate repo.

Both are real options and both cost an account or a domain plus a decision
about which Supabase project that origin talks to. **Say the word and I will
write it up — but do not create either just for this test.** Two facts make
the production origin the right call today:

1. **There are no real reps or customers.** Everything in production is test
   data you made. Nothing a bad result could damage is load-bearing.
2. **A same-account staging path would not isolate the thing that matters.**
   The whole point of the iPhone test is IndexedDB survival and service-worker
   behaviour, and staging would share the first and only partly separate the
   second.

**Nothing is deployed automatically.** Publishing v39 means merging
`claude/pest-sales-app-research-ba7u4n` into the default branch yourself. Do
that when you are ready to start step 3 and not before.

---

## 1. Before you touch the phone

- [ ] **1.1** Confirm the phone currently loads **Build v37**. (Production serves
      commit `c623c6f`. v38 was a branch build that was never published; the real
      jump is v37 → v39, and that is the jump the automated transition suites
      certify.)
- [ ] **1.2** Confirm the database still has only 0001 and 0002 applied
      (`db/APPLIED.md` has the read-only queries). **Do not apply
      `APPLY_v39.sql` yet.** Steps 2–7 run against the un-migrated database on
      purpose: that is the state the fleet is in during the window.
- [ ] **1.3** Take a backup from the phone (More → Backup) and AirDrop or
      email it to yourself. This is the undo button for everything below.

---

## 2. Starting state — v37, before the update

- [ ] **2.1** How do you actually open RALLY: installed to the Home Screen
      ("Add to Home Screen"), or a Safari tab? **Test the way reps will use
      it.** If it is installed, do the whole test from the Home Screen icon.
- [ ] **2.2** Open RALLY and sign in as your usual account.
- [ ] **2.3** Confirm the build badge reads **v37**. Write down where you
      found it.
- [ ] **2.4** Create **one test knock** at an address you can recognise. Use a
      fake street ("999 Test Ln"). Note the disposition you chose.
- [ ] **2.5** Create **one test customer**: first name `ZZTest`, last name
      `Before39`, a fake phone. Do **not** enter any real person's details.
- [ ] **2.6** On the customer's PAYMENT tab, note whether you can see **card
      number / expiry / routing / account** input fields. On v37 you can.
      **Write down exactly which fields you see** — step 6 checks they are
      gone.
- [ ] **2.7** Create **one test territory** called `ZZ Test Hood`, big enough
      to contain your test knock.
- [ ] **2.8** Note the numbers on your Home screen: doors today, and your
      personal total.

---

## 3. The suspended-app case — the one that matters most

This is the case no automated test can answer, and the one that decides the
fleet update instruction.

- [ ] **3.1** With RALLY **open on v37**, swipe up to the app switcher and
      leave RALLY **suspended there**. Do not swipe it away. Use another app
      for a minute.
- [ ] **3.2** Now publish v39 (merge the branch). Wait ~2 minutes for GitHub
      Pages to build.
- [ ] **3.3** Return to the **still-suspended** RALLY from the app switcher —
      do not relaunch it from the Home Screen.
- [ ] **3.4** Observe and write down, in this order:
      - Does it still say **v37**?
      - Does it reload by itself within ~10 seconds?
      - Does the build badge change to **v39** without you doing anything?
      - Do you see any transitional message, a blank flash, or a toast?
      - Does anything look broken or half-styled?

      *(What v39 is built to do: the new service worker installs, skips
      waiting, takes over and forces one reload. The automated v37 → v39
      run saw BOTH outcomes in Chromium, and both are correct: sometimes the
      resumed page reloads itself onto v39 within seconds; sometimes the
      browser holds the new worker in "waiting" until the next open, and the
      page stays a whole, coherent v37 until then. What was never seen, and
      must never be seen, is a mix — a v39 badge over v37 screens or the
      reverse. Whether iOS takes the first path or the second on a resumed
      suspended app is exactly what we do not know and are asking you to
      find out. Report what you see, not what you expect. Either path
      keeps every pin, hood, customer and unsent write — proven in
      tests/upgrade-transition-test.js §7 against the real v37 tree.)*

---

## 4. The actual update procedure

Do these in order and stop at the first one that gets you to v39. **Record
which step it was** — that number becomes the fleet instruction.

- [ ] **4.1** Close RALLY normally (Home gesture) and reopen it. Build?
- [ ] **4.2** If still v37: swipe RALLY fully **away** in the app switcher,
      then reopen. Build?
- [ ] **4.3** If still v37: reopen a second time. Build?
- [ ] **4.4** If still v37: Settings → Safari → Advanced → Website Data →
      remove `github.io`. **Then reopen and sign in again.** Build?
      *(This is the last resort and it clears the phone's local data — take
      the backup in 1.3 seriously.)*
- [ ] **4.5** Once you see **v39**: close and reopen twice more, and confirm
      it **stays** v39 and does not flip back.

---

## 5. Did the data survive?

- [ ] **5.1** Your test knock from 2.4 is still on the map, same disposition.
- [ ] **5.2** Customer `ZZTest Before39` still exists, with the same phone.
- [ ] **5.3** Territory `ZZ Test Hood` still exists, same shape.
- [ ] **5.4** Home screen numbers match what you wrote in 2.8.
- [ ] **5.5** Your role reads correctly (More → your name / role line). If you
      are an owner it should say owner, not rep.

---

## 6. The payment screen — no credential fields

- [ ] **6.1** Open `ZZTest Before39` → PAYMENT.
- [ ] **6.2** Every field you listed in 2.6 — card number, expiry, routing,
      account — is **gone**. What remains: method (card / bank draft), name on
      card, name on account, checking/savings, billing address, autopay
      switch.
- [ ] **6.3** The status line says setup is **pending** and that the office
      must collect the payment method. It must never say a method is on file
      or active.
- [ ] **6.4** If you see a toast saying *"RALLY is still updating — close and
      reopen before taking payment details"*, **that is a real finding**:
      the page loaded v37 markup with v39 code. Note it and reopen the app.
- [ ] **6.5** Type `4111111111111111` into **Name on card** and save. It must
      refuse it and tell you RALLY has no card-number field. Clear it after.

---

## 7. Offline

- [ ] **7.1** Airplane mode ON (and Wi-Fi off).
- [ ] **7.2** Fully close RALLY and reopen it. **It must boot.** If it shows a
      blank screen or an error, stop and report that — it is a blocker.
- [ ] **7.3** Create a test knock at "998 Offline Ln".
- [ ] **7.4** Edit `ZZTest Before39` — change the notes.
- [ ] **7.5** Close and reopen RALLY, still offline. Both survive?
- [ ] **7.6** Airplane mode OFF. Wait ~30 seconds, or open More and pull to
      refresh.
- [ ] **7.7** More screen: nothing outstanding, no "refused" count.
- [ ] **7.8** If you have a second device or a laptop signed into the same
      team, confirm the offline knock appears there.

---

## 8. Roles and territories

Needs a **second account** on the same team with the role `rep`. **Tell me
before the test if you do not already have one** — a rep account has to be
created and placed on the team server-side, and I cannot do that.

- [ ] **8.1** Signed in as the **rep** account: the territory tools (draw a
      hood, edit, Smart Split, delete) are **not offered**.
- [ ] **8.2** As the rep: knocking and creating a customer still work
      normally.
- [ ] **8.3** Back as **manager/owner**: territory tools are offered, and
      renaming `ZZ Test Hood` sticks after a close-and-reopen.

---

## 9. Smart Split — **only after the migrations are applied**

**Smart Split will not work until `APPLY_v39.sql` has been run.** A v39 client
against a database without 0005 gets a 404 from the server and honestly tells
you Smart Split is not switched on for the team yet; the hood is left exactly
as it was. That is correct behaviour, not a bug — but it means this section
comes after step 10, not before.

- [ ] **9.1** Apply `APPLY_v39.sql` (step 10 below), then come back here.
- [ ] **9.2** As manager/owner, open `ZZ Test Hood` → Split → 2 reps.
      **Use only the test hood.** Never split a hood you care about.
- [ ] **9.3** Two children appear, named `ZZ Test Hood A` and `B`.
- [ ] **9.4** Briefly they may read *"waiting on the team — not confirmed
      yet"*. Within a few seconds that wording should disappear.
- [ ] **9.5** Close and reopen RALLY. Both children are still there, the
      original `ZZ Test Hood` is gone, and your test knock sits inside one of
      the children.
- [ ] **9.6** Offline split: airplane mode ON, split `ZZ Test Hood A` into 2.
      The children appear marked *waiting on the team — not confirmed yet*.
- [ ] **9.7** Airplane mode OFF. Within a few seconds the "waiting" wording
      goes away and the parent disappears. Nothing is duplicated.

---

## 10. Applying the migrations (between 8 and 9)

Only once steps 1–8 pass and **every** device you care about is on v39.

- [ ] **10.1** Paste the whole of `rally/db/APPLY_v39.sql` into the Supabase
      SQL editor and run it once.
- [ ] **10.2** If it errors: nothing changed. Send me the message.
- [ ] **10.3** Run `rally/db/test/verify-production.sql`. Every row must say
      PASS. It is rollback-safe and changes nothing.
- [ ] **10.4** Fill in the status table in `rally/db/APPLIED.md`.

---

## 11. Restart and persistence

- [ ] **11.1** Fully close RALLY. Restart the iPhone. Reopen RALLY.
- [ ] **11.2** Still **v39**.
- [ ] **11.3** All the test data from 5.1–5.4 is still there.
- [ ] **11.4** Airplane mode ON, reopen: it still boots offline.
- [ ] **11.5** The payment screen still shows no credential fields.
      (v37's did.)

---

## 12. Clean up

- [ ] **12.1** Delete the test customer, test knocks and test hoods you made.
- [ ] **12.2** Keep the backup from 1.3 until you are happy.

---

## What to send back

Copy this block, fill it in, paste it to me.

```
iPhone model:
iOS version:
Installed PWA or Safari tab:
Starting build:
Ending build:

3.4  Suspended v37, resumed after v39 published, behaved as:
4.x  Which step first showed v39 (4.1 / 4.2 / 4.3 / 4.4):
4.5  Did it STAY v39 across two more reopens:
5.x  Data survived (knock / customer / territory / numbers / role):
6.2  Old card + routing input fields absent:
6.4  Did the "still updating" toast ever appear:
6.5  Card number in the name field was refused:
7.2  Offline boot:
7.5  Offline write survived a close/reopen:
7.7  Reconnect synced clean, nothing refused:
8.1  Rep saw no territory tools:
8.3  Manager territory edit stuck:
10.3 verify-production.sql — all PASS:
9.x  Smart Split: normal / persisted / offline-then-reconnect:
11.x Survived a phone restart:

Anything odd, slow, ugly or surprising — however small:
```

**Do not treat v39 as certified until this comes back.** Anything in section
3, 4, 5, 7.2 or 10.3 going wrong is a blocker, not a note.
