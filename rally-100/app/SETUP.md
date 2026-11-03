# RALLY 100: switching it on

RALLY 100 runs on the same Supabase project as the RALLY sales app. Everything it adds lives in its own database section, `rally100`; nothing in RALLY's tables, rules or tests changes. Until the steps below are done, the app opens and shows "Not switched on yet".

These steps change the live database, so they are the owner's to approve and run. Each one is reversible (see the end).

## One-time steps

1. **Read what will change.** `rally-100/db/migrations/1001_rally100_v1.sql` creates the `rally100` section: the tables for lists, people, introductions, requirements, rewards, incentives and the history log, and the server functions the app calls. Browsers get no direct access to any table; every action goes through a function that checks who is asking.
2. **Apply it.** Supabase, then SQL editor, then paste all of `rally-100/db/APPLY_rally100_v1.sql`, then Run. It is one all-or-nothing transaction: it either finishes completely or changes nothing.
3. **Expose the section to the app.** Supabase, then Project Settings, then Data API (called API in older dashboards), then **Exposed schemas**: add `rally100`, then Save.
4. **Let emails come back to the app.** Supabase, then Authentication, then URL Configuration, then **Redirect URLs**: add `https://ceojohnmartin.github.io/business-vault/rally-100/app/` and Save. Confirmation and password-reset emails then open RALLY 100.
5. **Publish the app.** Merge the `claude/rally-100-blueprint` branch into `main`. GitHub Pages then serves the app at:

       https://ceojohnmartin.github.io/business-vault/rally-100/app/

   Reps open that link on their phone and use "Add to Home Screen".
6. **Check it.** Sign in at that link with your owner account. The Owner Dashboard opens. If it says "Not switched on yet", step 2 or 3 did not finish.

## People and accounts

- **Same accounts as RALLY.** Anyone with a RALLY login signs in to RALLY 100 with the same email and password.
- **New reps** tap "Create account" in RALLY 100, confirm their email, and land on "Almost there". Your Owner Dashboard lists them under **New sign-ups waiting for a team**, with a Copy button for the one line that adds each person to your team. Paste that line in the Supabase SQL editor and run it. This keeps RALLY's rule that nobody can put themselves on a team.
- **Leaders** are made the same way RALLY makes them: in the SQL editor, `update public.profiles set role = 'leader' where email = 'leader@example.com';`
- **Reps who leave or don't come out:** on the Rewards page, use "Close unpaid rewards" on that rep. Every reward of theirs that isn't paid yet is closed, and later awards, approvals and payments for them are refused until you tap "Reopen". Rewards already marked Pay issued stay as they are. The rep is never shown a reason. To turn off their login as well, the same way RALLY does: `update public.profiles set disabled = true where email = 'rep@example.com';`

## Taking it back out

`rally-100/db/ROLLBACK_rally100_v1.sql` removes the whole `rally100` section in one transaction and touches nothing in RALLY. Remove `rally100` from Exposed schemas afterwards. The app then shows "Not switched on yet" again.

## For developers

- The backend contract is `rally-100/app/API.md`; the database tests are `rally-100/db/test/run-tests.sh`.
- Releasing a change to the app: bump the `?v=` numbers in `index.html` and `VERSION` (and the same `?v=` numbers) in `sw.js` together, or phones keep the old files.
- `rally-100/app/dev/` has a local stand-in for Supabase so the whole app can be run and tested on a laptop with no access to the live project. See `rally-100/app/dev/README.md`.
