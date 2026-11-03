# RALLY 100 app: backend contract

This is the single contract between the RALLY 100 database and every screen. The SQL implements it, the screens call it, and the tests check it. If code and this file disagree, fix one of them; never let them drift.

Product rules come from `rally-100/BLUEPRINT.md`. Architecture rules come from the repository `CLAUDE.md` (RALLY-owned IDs, money in integer cents, append-only ledger, server-authored truth, idempotent writes, team scoping).

## 1. Shape

- **Backend**: the existing RALLY Supabase project. Everything RALLY 100 adds lives in its own schema, `rally100`. Nothing in RALLY's `public` schema is created or altered. RALLY 100 reads `public.profiles`, `public.teams` and `auth.uid()` only.
- **RPC only**: clients never read or write `rally100` tables. Tables have RLS enabled, no policies and no grants to `anon` or `authenticated`. Every client operation is a function `rally100.<name>(...)`: `SECURITY DEFINER`, `set search_path = ''`, every identifier schema-qualified, `revoke all ... from public, anon, authenticated, service_role`, then `grant execute ... to authenticated` for API functions only. Internal helpers (prefixed `_`) are granted to nobody.
- **Exposure**: the schema must be added to Supabase **Project Settings → Data API → Exposed schemas** (`rally100`). Clients call `POST {url}/rest/v1/rpc/<name>` with headers `apikey`, `Authorization: Bearer <access token>`, `Content-Type: application/json`, `Content-Profile: rally100`, `Accept-Profile: rally100`. The body is a JSON object of named parameters. Every function returns one `jsonb` value.
- **Auth**: same accounts as the RALLY sales app. Email and password via Supabase auth (`/auth/v1/token?grant_type=password`, `refresh_token`, `/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/logout`). New sign-ups get RALLY's least-privilege profile (role `rep`, no team). Placement on a team stays a server-side act by leadership, exactly as in RALLY.

## 2. Roles and scope

Resolved server-side on every call by `rally100._caller()`, never accepted from the client.

| Caller | `public.profiles.role` | Scope |
|---|---|---|
| Rep | `rep` | Own List Entries only |
| Leader | `leader` or `manager` | Every rep with the same `team_id` (`public.my_team_id()`) |
| Owner | `owner` | Every team |

`_caller()` raises `rally100: not signed in` when `auth.uid()` is null, `rally100: no team` when the profile has no `team_id`, `rally100: disabled` when `profiles.disabled`. All three use `errcode '42501'`. A leader or owner may also build their own list; every rep function works for every role on the caller's own entries.

Errors: authorization failures use `errcode '42501'` and messages starting `rally100: `. Validation failures use `errcode '22023'` and a message `rally100: <code>` where `<code>` is a stable snake_case token the client maps to wording (for example `rally100: invalid_phone`). Clients show the mapped wording, never raw database text.

## 3. Vocabulary and fixed values

- **Platforms**: `Instagram`, `Snapchat`, `TikTok`, `Facebook`, `X`, `LinkedIn`, `Discord`, `Other` (Other requires `other_app`).
- **Tags**: `School`, `Sports`, `Work`, `Gym`, `Neighborhood`, `Family`, `Group chat`, `Hobbies/Clubs/Community`, `Lost touch`, `Other`.
- **Scenes** (`scene` key, clears-at): `phone` 5, `chats` 5, `shift` 3, `lunch` 3, `bus` 3, `gym` 3, `street` 3, `lost` 3, `family` 3, `clubs` 3, `roommates` 3, `bignight` 3, `plusone` 3, `mutual` 3. Entries added outside a Scene have `scene = null`.
- **Stages** (ordered): `added`, `intro_planned`, `introduced`, `meeting_scheduled`, `meeting_completed`, `commitment_confirmed`, `agreement_signed`, `start_confirmed`, `arrived`.
- **Outcomes**: `follow_up`, `not_interested`, `do_not_contact` (or null).
- **Interest**: `unknown` (default), `interested`, `maybe`, `not_interested`.
- **Requirements**: 1 Meeting completed, 2 Commitment confirmed, 3 Agreement signed, 4 Start date and travel plans confirmed.
- **Reward kinds**: `list` ($100, one per rep, ever), `referral` ($100, one per Person, ever), `incentive` (owner-defined amount).
- **Reward statuses**: `in_progress`, `ready` (Ready for review), `approved` (every screen shows "Pending pay"), `paid` (every screen shows "Pay issued"), `needs_correction`. A reversal is a flag on the record, never a sixth status.
- **Milestones**: 10, 25, 50, 75, 100 counted contacts; XP 50, 100, 200, 300, 500.
- **Levels** (XP): Rookie 0, Scout 150, Connector 400, Operator 800, Prowler 1300, Apex 2000.
- **Money**: integer cents everywhere (`amount_cents`), currency USD.

## 4. Core rules the server enforces

1. **Normalization.** Phone: digits only, a leading `1` dropped from 11 digits; stored only as exactly 10 digits or `''`. A non-empty phone that does not normalize to 10 digits raises `invalid_phone`. Handle: trimmed, lowercased, leading `@` and any `https://host/` prefix removed, trailing `/` `?` `#` parts removed. A handle without a platform raises `platform_required`; `Other` without `other_app` raises `other_app_required`. First name is required (`first_required`), at most 60 characters; last name at most 60; notes at most 2000; tags must be in the list.
2. **Complete** = first, last, a 10-digit phone, a handle and a platform (plus `other_app` for Other).
3. **Counted** = complete AND not removed AND not held as a duplicate AND its Person is not marked `do_not_contact`. A rep's count is the number of counted entries. Not interested and Follow up later still count.
4. **Within-rep duplicates.** On every save, an entry with a phone or a handle is compared with the same rep's other entries that are not removed and not held: same phone, or same platform plus handle (plus `other_app` for Other). Pairs the rep marked "Different people" are skipped. If a match exists, the NEWER entry (later `created_at`) gets `held_of = <older id>` and stops counting; the older keeps counting. Name-only matches never hold.
5. **Resolving a duplicate.** "Same person": the older entry takes any field it is missing from the newer one, tags are united, notes appended; the newer is removed with `merged_into`; no XP is granted for the merge (the older's completion XP key is recorded if it becomes complete). "Different people" is allowed only for a same-phone match and needs a reason: both entries record each other in `kept_with`, the newer is released and counts, and its XP key becomes per-entry.
6. **Persons (master CRM).** When an entry first has a phone or handle and is not held, it is linked to a Person: an existing Person whose identifiers share the phone, or the platform plus handle, AND whose last name matches case-insensitively (or where both phone and handle match). Otherwise a new Person is created from the entry, and if a strong signal matched a Person with a different last name, a `possible_matches` row is recorded for leaders. Every identifier an entry carries is added to its Person. Persons are never deleted.
7. **XP is game progress only, never money.** Keys are unique per rep in `xp_events`, so nothing is ever earned twice. `cc:<phone>` (or `cc:<phone>#<entry id>` after "Different people") +10 when an entry becomes counted; `ch:<same>` +3 when that entry was added under a chain prompt; `sc:<scene>` +15 when a Scene's counted entries reach its clears-at; `ms:<N>` at each milestone; `in:<person id>` +100 when a leader confirms the rep's introduction was received. Removing and re-adding grants nothing new.
8. **List Completion Reward.** The first time a rep's count reaches 100, the server inserts the single `list` reward (unique per rep) at `ready`. While `ready` and the count is under 100, reads report `hold = true`. Approval needs count ≥ 100 AND a recorded spot-check for that reward.
9. **Referral Reward.** The first time any rep records an introduction of a Person (`record_intro`), the server inserts the single `referral` reward for that Person (unique per Person) at `in_progress` with no credited rep. When the fourth requirement is confirmed, the server credits **whoever signs the person first**: the rep with the earliest `recorded_at` among that Person's introductions with `received_at` set, and moves the reward to `ready`. With no received introduction, the reward stays `in_progress` and is flagged `no_intro` for the owner. Unticking a requirement before approval returns the reward to `in_progress` and clears the credit. After `approved` or `paid`, unticking is refused (`locked_reward`).
10. **Requirements** are confirmed one by one by a leader or the owner, with a name and date. A stage change never confirms one. Requirement 4 needs `start_date` and either a `travel_note` or `travel_na = true`.
11. **Do not contact** removes the Person from every rep's count. Only a leader or the owner sets it; only the owner clears it.
12. **Review.** Leaders approve or return rewards of reps on their team; the owner may approve any. Nobody approves a reward credited to themselves (`self_involved`); the owner's own rewards are approved only by another owner. Only the owner marks pay issued, reverses, or closes a leaving rep's unpaid rewards.
13. **Leaving reps.** `close_rep_unpaid(rep, reason)` reverses every unpaid reward of that rep with an internal reason (`left` or `no_show`) and no rep-facing reason. Paid rewards are untouched. Nothing about this rule is ever returned to a rep.
14. **Audit.** Every write appends to `rally100.audit` (actor, team, entity, entity id, action, detail). Reward transitions also append to `rally100.reward_events`. Neither table is ever updated or deleted.
15. **Idempotency.** `save_entry` creates with a client-generated UUID, so a retried create is an update. Every transition function checks the current status and refuses or no-ops a repeat; a second `mark_pay_issued` raises `already_paid`.

## 5. Tables (`rally100` schema)

No client grants on any table. RLS enabled on all.

- `entries`: `id uuid pk` (client-generated), `team_id uuid not null`, `rep_id uuid not null`, `person_id uuid null`, `first_name text`, `last_name text`, `phone text check (phone ~ '^(\d{10})?$')`, `handle text`, `platform text`, `other_app text`, `tags text[]`, `notes text`, `scene text null`, `chain_hit bool`, `held_of uuid null`, `kept_with uuid[]`, `kept_reason text`, `merged_into uuid null`, `removed_at timestamptz null`, `completed_at timestamptz null`, `verified_at timestamptz null`, `verified_by uuid null`, `created_at timestamptz`, `updated_at timestamptz`. A stored generated column `is_complete boolean`.
- `persons`: `id uuid pk`, `first_name`, `last_name`, `stage text`, `outcome text null`, `outcome_date date null`, `outcome_note text`, `interest text`, `responsible_leader uuid null`, `next_action text`, `next_action_owner uuid null`, `next_action_date date null`, `meeting_at timestamptz null`, `meeting_how text`, `meeting_note text`, `start_date date null`, `travel_note text`, `travel_na bool`, `merged_into uuid null`, `created_at`, `updated_at`.
- `person_identifiers`: `person_id`, `kind` (`phone` or `handle`), `value` (phone digits, or `<platform>:<handle>` with `Other:<app>:<handle>`), unique `(kind, value, person_id)`.
- `possible_matches`: `id`, `person_a`, `person_b`, `signal`, `status` (`open`, `linked`, `dismissed`), `created_at`, `resolved_by`, `resolved_at`.
- `introductions`: `id uuid pk`, `person_id`, `rep_id`, `entry_id`, `status` (`planned`, `introduced`), `channel` (`text`, `call`, `in_person`, `other`), `said` (`in`, `maybe`, `not_for_them`, `didnt_say`), `note`, `intro_date date`, `recorded_at timestamptz null` (server time when it became introduced), `received_by uuid null`, `received_at timestamptz null`; unique `(person_id, rep_id)`.
- `requirements`: `(person_id, req smallint 1..4)` pk, `confirmed bool`, `confirmed_by uuid`, `event_date date`, `note text`, `updated_at`.
- `messages`: `id`, `person_id`, `rep_id`, `body`, `created_at`, `read_by`, `read_at`.
- `notes`: `id`, `person_id`, `author`, `body`, `created_at` (leader notes, append-only).
- `xp_events`: `(rep_id, key)` pk, `points int`, `kind text`, `created_at`.
- `badges`: `(rep_id, badge)` pk, `created_at`. Server-derived: `reader` (3 Scenes cleared), `full` (100), `first_intro`, `matchmaker` (3 received introductions). Client-reported through `award_badge`: `sprinter`, `clean_sweep`.
- `acks`: `(rep_id, version)` pk, `accepted_at`. Current disclosure version: 1.
- `rewards`: `id uuid pk`, `kind`, `team_id`, `rep_id uuid null` (credited rep; null for a referral until credited), `person_id null`, `incentive_id null`, `amount_cents int`, `currency text default 'USD'`, `status`, `flags text[]` (`no_intro`), `spot_check_id null`, `approved_by`, `approved_at`, `paid_on date`, `paid_method text`, `paid_reference text`, `paid_by`, `reversed_at`, `reversed_by`, `reversed_reason text` (internal), `rep_reason text` (rep-facing, may be empty), `correction_note text`, `correction_by`, `created_at`, `updated_at`. Partial unique indexes: one `list` per `rep_id`; one `referral` per `person_id`.
- `reward_events`: append-only ledger: `id bigserial`, `reward_id`, `action`, `from_status`, `to_status`, `actor`, `note`, `created_at`.
- `spot_checks`: `id`, `reward_id`, `rep_id`, `leader_id`, `results jsonb` (`[{entry_id, result: looks_real|unclear|not_real}]`), `note`, `created_at`.
- `incentives`: `id`, `name`, `pictures jsonb` (array of `data:image/jpeg;base64,...` strings, at most 4, each at most 400,000 characters), `prize_cents int`, `how_to_earn text`, `status` (`draft`, `published`, `off`), `created_by`, `created_at`, `updated_at`.
- `audit`: `id bigserial`, `actor`, `team_id`, `entity`, `entity_id`, `action`, `detail jsonb`, `created_at`.

## 6. Functions

Every function returns `jsonb`. Times are ISO strings; dates `YYYY-MM-DD`; money `amount_cents`. Names shown to clients are `profiles.name`, falling back to the part of `email` before `@`.

### 6.1 Everyone

- **`whoami()`** → `{user:{id,name,email,role,team_id,team_name}, ack_version_required:1, ack_accepted:bool}`. For a caller with no team returns `{user:{...}, no_team:true}` instead of raising, so the app can explain placement.
- **`accept_ack(p_version int)`** → `{ok:true}`.

### 6.2 Rep functions (caller's own entries; any role)

- **`rep_state()`** → everything the rep app shows:
  `{count, drafts, held, xp, level:{name,min,next_name,next_min}, milestones:[10,25,...reached], badges:[...], scenes:{<key>:{names,lit,drafts,cleared}}, entries:[entry...], list_reward:{status,hold,amount_cents,approved_at,paid_on,reversed,rep_reason} | null, referrals:[referral...], intros:[intro...], incentives:[{id,name,pictures,prize_cents,how_to_earn}] (published only), awards:[{id,incentive_id,name,amount_cents,status,paid_on,reversed,rep_reason}], leader:{name} | null}`.
  - `entry` = `{id, first_name, last_name, phone, handle, platform, other_app, tags, notes, scene, chain_hit, is_complete, counted, held_of, held_of_name, kept_with, removed, merged_into, created_at, completed_at, missing:[...labels], person_id, dnc:bool}`. Removed entries are included with `removed:true` (merged ones excluded).
  - `intro` = one per entry that has an introduction or a Person stage beyond `added`: `{entry_id, person_id, name, status (planned|introduced), recorded_at, received:bool, stage, outcome, outcome_date, interest, requirements:[{req,confirmed,by_name,event_date}] (only when this rep recorded an introduction), next:{who:'you'|'leader', name, text}, meeting_at, leader_name}`.
  - `referral` = for each Person this rep recorded an introduction of: `{person_id, name, status, credited:'me'|'other'|null, confirmed_count, requirements:[...], approved_at, paid_on, reversed, rep_reason}`. When credited to another rep, only `credited:'other'` and the name are returned.
- **`save_entry(p jsonb)`** creates or updates by `p.id` (UUID). Fields: `id, first_name, last_name, phone, handle, platform, other_app, tags, notes, scene, chain_hit`. Absent keys leave a field unchanged on update. Refuses an id owned by another rep (`not_found`) and a removed or merged entry (`entry_removed`). Returns `{entry, effects:[effect...], count, drafts, held, xp, level}`, where `effect` is one of `{type:'xp', points, key}`, `{type:'milestone', n}`, `{type:'scene_cleared', scene}`, `{type:'level', name}`, `{type:'held', older_id, older_name, by:'phone'|'handle'}`, `{type:'list_ready'}`.
- **`resolve_duplicate(p_entry uuid, p_decision text, p_reason text)`**, decision `same` or `different` → same shape as `save_entry` with `entry` = the surviving or released entry. `different` on a handle-only match raises `handle_match_needs_fix`; a missing reason raises `reason_required`.
- **`remove_entry(p_entry uuid)`** / **`restore_entry(p_entry uuid)`** → same shape as `save_entry`. Restore re-runs the duplicate check; no XP is granted twice.
- **`plan_intro(p_entry uuid)`** → `{intro}`. Requires a complete, counted entry (`entry_not_complete`, `held_duplicate`, `do_not_contact`). Creates or keeps the rep's introduction at `planned`; Person stage moves to `intro_planned` if it was `added`.
- **`record_intro(p_entry uuid, p_channel text, p_said text, p_note text, p_date date)`** → `{intro}`. Same preconditions. Sets the introduction to `introduced` with `recorded_at = now()` (only the first time); stores `said` and sets Person interest from it (`in`→interested, `maybe`→maybe, `not_for_them`→not_interested, `didnt_say`→unknown) only if no leader has set interest; Person stage moves to `introduced` if lower; responsible leader defaults to the team's first leader (by `created_at`) if none; inserts the Person's referral reward at `in_progress` if none exists.
- **`set_follow_up(p_entry uuid, p_date date, p_note text)`** → `{intro}`. Rep may set Follow up later only while the Person stage is `added`, `intro_planned` or `introduced` and the rep has an entry for it.
- **`tell_leader(p_entry uuid, p_body text)`** → `{ok:true}`. Body 1 to 1000 characters.
- **`award_badge(p_badge text)`** → `{badges}`. Only `sprinter` and `clean_sweep`; idempotent.

### 6.3 Leader functions (leader, manager or owner; team scope, owner all teams)

- **`team_state()`** → `{reps:[{id,name,email,role,count,drafts,held,last_activity,list_reward:{id,status,hold,spot_checked}|null, intros_received, signed}], queues:{new_intros:[q], meetings:[q], follow_ups:[q], confirmations:[q], reviews:[r], messages:[m], matches:[pm]}, counts:{...}}`.
  - `q` = `{person_id, name, stage, outcome, outcome_date, meeting_at, reps:[names in scope], next_action, confirmed_count, updated_at}`. `new_intros`: introductions recorded and not yet received. `meetings`: stage `meeting_scheduled`. `follow_ups`: outcome `follow_up` with `outcome_date` ≤ today. `confirmations`: stage ≥ `meeting_completed` with fewer than 4 confirmed and no blocking outcome.
  - `r` = `{reward_id, kind, status, rep_id, rep_name, person_id, person_name, amount_cents, hold, spot_checked, flags}` for rewards at `ready` or `needs_correction`.
  - `m` = unread rep messages `{id, person_id, person_name, rep_name, body, created_at}`.
  - `pm` = open possible matches `{id, a:{id,name}, b:{id,name}, signal}`.
- **`person_detail(p_person uuid)`** → `{person, entries:[{rep_id,rep_name,added_at,tags,introduced:bool,recorded_at,received_at}] (reps outside the caller's scope appear as {rep_name:'A rep on another team'}), identifiers:[...], requirements:[{req,confirmed,by_name,event_date,note}], reward:{...}|null, notes:[...], messages:[...], history:[audit rows, newest first, at most 100]}`. Refuses a Person outside scope (`not_found`).
- **`confirm_intro_received(p_person uuid, p_rep uuid)`** → `{ok}`. Sets `received_by/received_at` once; grants the rep `in:<person>` +100 XP; sets the responsible leader to the caller if none; checks the rep's `first_intro` and `matchmaker` badges.
- **`set_stage(p_person uuid, p_stage text, p_date date, p_note text)`** → `{person}`. Leader-owned stages are `meeting_scheduled` onward; a backward move needs a note (`reason_required`).
- **`schedule_meeting(p_person uuid, p_at timestamptz, p_how text, p_note text)`** → `{person}`. Sets stage `meeting_scheduled` if lower.
- **`set_requirement(p_person uuid, p_req int, p_confirmed bool, p_event_date date, p_note text, p_start_date date, p_travel_note text, p_travel_na bool)`** → `{person, requirements, reward}`. Applies rules 9 and 10. Unticking needs a note (`reason_required`).
- **`set_outcome(p_person uuid, p_outcome text, p_date date, p_note text)`** → `{person}`. `follow_up` needs a date; `not_interested` needs a note; `do_not_contact` allowed; null clears an outcome, except clearing `do_not_contact`, which is owner-only (`owner_only`).
- **`set_interest(p_person uuid, p_interest text)`**, **`set_next_action(p_person uuid, p_text text, p_owner uuid, p_date date)`**, **`add_note(p_person uuid, p_body text)`**, **`mark_messages_read(p_person uuid)`** → `{ok}`.
- **`rep_list(p_rep uuid)`** → `{rep:{id,name}, count, entries:[entry...], sample:[3 to 5 random counted entries, stable for the day]}` for the walkthrough.
- **`record_spot_check(p_reward uuid, p_results jsonb, p_note text)`** → `{reward}`. Only for a `list` reward. Results name 3 to 5 of that rep's counted entries; `looks_real` marks the entry verified.
- **`review_reward(p_reward uuid, p_action text, p_note text)`**, action `approve` or `needs_correction` → `{reward}`. `approve` needs status `ready` and the rule 8 or 9 conditions (`count_below_100`, `spot_check_required`, `no_credited_rep`, `not_ready`); `needs_correction` needs a note. Rule 12 applies (`self_involved`).
- **`resolve_correction(p_reward uuid, p_note text)`** → `{reward}`: `needs_correction` back to `ready`, by whoever raised it or the owner.
- **`link_persons(p_match uuid, p_action text)`**, action `link` (merge B into A: identifiers, entries, introductions, requirements moved; refused when both have a referral reward, `both_have_rewards`) or `dismiss` → `{ok}`.
- **`award_incentive(p_incentive uuid, p_rep uuid, p_note text)`** → `{reward}`. Incentive must be `published`; note required; creates an `incentive` reward at `approved` (rule 12 applies).

### 6.4 Owner functions

- **`owner_state()`** → `{totals:{reps, persons, counted, introductions, signed}, reps:[same as team_state.reps plus team_name], funnel:{<stage>:n}, outcomes:{...}, rewards:{<status>:{count, amount_cents}}, payments:[last 50 paid], leaders:[{id,name,team_name,open_items}], pending_signups:[{id,name,email,created_at}], incentives:[all, any status]}`.
- **`owner_contacts()`** → `{rows:[{person_id, name, phone, handles:[...], reps:[names], team_names, stage, outcome, interest, created_at, requirements_confirmed, reward_status}]}` for search, filters and CSV export.
- **`owner_rewards(p_status text)`** → `{rows:[reward rows with rep and person names, all statuses when null]}`.
- **`mark_pay_issued(p_reward uuid, p_paid_on date, p_method text, p_reference text)`** → `{reward}`. Needs `approved`; method note required (`method_required`); `already_paid` on repeat.
- **`reverse_reward(p_reward uuid, p_reason text, p_rep_reason text)`** → `{reward}`. Internal reason required.
- **`close_rep_unpaid(p_rep uuid, p_reason text)`**, reason `left` or `no_show` → `{closed:n}`.
- **`correct_credit(p_reward uuid, p_rep uuid, p_reason text)`** → `{reward}`.
- **`clear_dnc(p_person uuid)`** → `{person}`.
- **`incentive_save(p jsonb)`** → `{incentive}`: create (no id) or update (`id`), fields `name` (required, at most 80), `pictures` (rule above, at least 1 to publish), `prize_cents` (≥ 0, required), `how_to_earn` (optional, at most 200), `status`.
- **`incentive_status(p_incentive uuid, p_status text)`** → `{incentive}`.

## 7. Client conventions

- Wording follows the blueprint. Approved shows "Pending pay"; paid shows "Pay issued" with the date. Money is never shown as earned, partial or pending before approval. Requirement codes never appear on rep screens.
- Rep writes go through an outbox: `save_entry` calls carry client-generated UUIDs and are replayed in order when the phone is back online. Until the server answers, a new tile shows the syncing state. Server counts always win.
- The owner's "Mark pay issued" is the only control that moves a reward to Pay issued. Nothing about the leaving-rep rule appears anywhere a rep can see.
